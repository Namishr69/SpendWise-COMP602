import subscriptionRepo from '../repositories/subscriptionRepo.js';
import priceAlertService, { findPriceChanges } from './priceAlertService.js';

/**
 * Finds recurring payments hidden in a list of bank transactions and turns them
 * into subscription records.
 *
 * The detection itself (detectRecurring) is a pure function of a transaction
 * array, which is what makes it straightforward to test. detectAndPersist wraps
 * it with the Firestore reads and writes, and is careful to be idempotent: a
 * second sync of the same data must not create a second copy of a subscription.
 */
const MIN_OCCURRENCES = 3;

const CADENCES = [
    { cycle: 'Weekly', minDays: 5, maxDays: 9, periodDays: 7 },
    { cycle: 'Fortnightly', minDays: 12, maxDays: 16, periodDays: 14 },
    { cycle: 'Monthly', minDays: 26, maxDays: 35, periodDays: 30 },
    { cycle: 'Quarterly', minDays: 84, maxDays: 96, periodDays: 91 },
    { cycle: 'Annually', minDays: 350, maxDays: 380, periodDays: 365 },
];

function normaliseMerchant(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/\bxx\d+\b/g, ' ')       // masked card numbers
        .replace(/\b\d[\d/.-]{3,}\b/g, ' ') // long digit/date runs
        .replace(/[^a-z\s]/g, ' ')          // punctuation
        .replace(/\s+/g, ' ')
        .trim();
}

/** Buckets an amount so near-equal charges group together (±5%, ~$1 floor). */
function amountBucket(amount) {
    const tolerance = Math.max(1, amount * 0.05);
    return Math.round(amount / tolerance);
}

function median(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Matches a median gap in days to a known cadence, or null if none fits. */
function classifyCadence(medianGapDays) {
    return CADENCES.find(
        (c) => medianGapDays >= c.minDays && medianGapDays <= c.maxDays
    ) || null;
}

function addDays(isoDate, days) {
    const date = new Date(isoDate);
    date.setDate(date.getDate() + days);
    return date.toISOString();
}

function daysBetween(earlier, later) {
    return (new Date(later.bookedAt) - new Date(earlier.bookedAt)) /
        (1000 * 60 * 60 * 24);
}

function sortByBookedAt(transactions) {
    return [...transactions].sort((a, b) => (a.bookedAt < b.bookedAt ? -1 : 1));
}

/** Gaps between consecutive charges, in days. */
function gapsInDays(sorted) {
    const gaps = [];
    for (let i = 1; i < sorted.length; i += 1) {
        gaps.push(daysBetween(sorted[i - 1], sorted[i]));
    }
    return gaps;
}

function fitsCadence(gapDays, cadence) {
    return gapDays >= cadence.minDays && gapDays <= cadence.maxDays;
}

/**
 * A price change moves every later charge into a different amount bucket, so
 * on their own those charges look like a separate series (or, for the first
 * couple after the change, like no series at all). This folds them back into
 * the subscription they continue, so the price change can be compared against
 * the charge before it rather than lost or detected as a new subscription.
 *
 * Two steps, per merchant:
 *  1. Extend each series with unclaimed charges that follow its last charge
 *     on cadence, whatever their amount.
 *  2. Merge a series into the one before it when it has the same cadence and
 *     starts after that one ends — the same subscription at a new price.
 *     Series that overlap in time are genuinely separate subscriptions.
 */
function foldPriceChanges(series, debits) {
    const claimed = new Set(series.flatMap((s) => s.transactions));

    for (const s of series) {
        const followOn = sortByBookedAt(
            debits.filter(
                (t) =>
                    !claimed.has(t) &&
                    t.merchantKey === s.merchantKey &&
                    t.bookedAt > s.transactions[s.transactions.length - 1].bookedAt
            )
        );

        for (const txn of followOn) {
            const gap = daysBetween(s.transactions[s.transactions.length - 1], txn);
            if (gap > s.cadence.maxDays) break;
            if (!fitsCadence(gap, s.cadence)) continue; // a one-off purchase
            s.transactions.push(txn);
            claimed.add(txn);
        }
    }

    const ordered = [...series].sort((a, b) =>
        a.merchantKey !== b.merchantKey
            ? (a.merchantKey < b.merchantKey ? -1 : 1)
            : (a.transactions[0].bookedAt < b.transactions[0].bookedAt ? -1 : 1)
    );

    const folded = [];
    for (const s of ordered) {
        const previous = folded[folded.length - 1];
        const continuesPrevious =
            previous &&
            previous.merchantKey === s.merchantKey &&
            previous.cadence.cycle === s.cadence.cycle &&
            s.transactions[0].bookedAt >
                previous.transactions[previous.transactions.length - 1].bookedAt;

        if (continuesPrevious) {
            // Keep the earlier series' detectionKey so it still matches the
            // subscription that was already persisted for it.
            previous.transactions.push(...s.transactions);
        } else {
            folded.push(s);
        }
    }

    return folded;
}

function toCandidate({ detectionKey, cadence, transactions }) {
    const sorted = sortByBookedAt(transactions);
    const gaps = gapsInDays(sorted);
    const last = sorted[sorted.length - 1];

    // Confidence: more occurrences and steadier gaps are more convincing.
    const gapConsistency =
        gaps.length > 0
            ? gaps.filter((g) => fitsCadence(g, cadence)).length / gaps.length
            : 0;
    const confidence = Math.min(
        1,
        0.5 * gapConsistency + 0.5 * Math.min(1, sorted.length / 6)
    );

    return {
        detectionKey,
        name: (last.merchant || last.description || 'Subscription').trim(),
        amount: Number(last.amount.toFixed(2)),
        currency: last.currency || 'NZD',
        billingCycle: cadence.cycle,
        nextPaymentDate: addDays(last.bookedAt, cadence.periodDays).slice(0, 10),
        confidence: Number(confidence.toFixed(2)),
        transactions: sorted.map(({ merchantKey, ...txn }) => txn),
    };
}

/**
 * Pure detection. Given transactions, returns candidate subscriptions with the
 * transactions that make up each one. No I/O.
 */
export function detectRecurring(transactions) {
    // Only outgoing payments can be subscriptions. Tag each with its
    // normalised merchant so later steps can compare merchants cheaply.
    const debits = transactions
        .filter((t) => t.direction === 'debit')
        .map((t) => ({ ...t, merchantKey: normaliseMerchant(t.merchant || t.description) }))
        .filter((t) => t.merchantKey);

    // Group by (normalised merchant + amount bucket).
    const groups = new Map();
    for (const txn of debits) {
        const key = `${txn.merchantKey}|${amountBucket(txn.amount)}`;

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(txn);
    }

    const series = [];

    for (const [key, groupTxns] of groups) {
        if (groupTxns.length < MIN_OCCURRENCES) continue;

        const sorted = sortByBookedAt(groupTxns);
        const cadence = classifyCadence(median(gapsInDays(sorted)));
        if (!cadence) continue;

        series.push({
            merchantKey: sorted[0].merchantKey,
            detectionKey: `${key}|${cadence.cycle}`,
            cadence,
            transactions: sorted,
        });
    }

    return foldPriceChanges(series, debits).map(toCandidate);
}

/** detectionKey is merchant|bucket|cycle; this drops the price bucket. */
function seriesKey(detectionKey) {
    const [merchant, , cycle] = String(detectionKey).split('|');
    return `${merchant}|${cycle}`;
}

const subscriptionDetectionService = {
    /**
     * Runs detection over the user's synced transactions and persists any new
     * subscriptions. Idempotent: subscriptions carry a detectionKey, and a
     * candidate whose key already exists is skipped, so re-syncing never
     * duplicates. Manually-added subscriptions (no source marker) are never
     * touched.
     */
    async detectAndPersist(userId, transactions) {
        const candidates = detectRecurring(transactions);
        if (candidates.length === 0) {
            return { detected: 0, created: 0, updated: 0, priceChanges: 0 };
        }

        const existing = await subscriptionRepo.getAll(userId);
        const detected = existing.filter((s) => s.detectionKey);
        const existingKeys = new Map(detected.map((s) => [s.detectionKey, s]));

        // Fallback match ignoring the price bucket, for when a price change
        // has moved a subscription's charges into a new bucket (e.g. the
        // pre-change charges aged out of the bank's history window). Only
        // used where it is unambiguous: one subscription for that series.
        const seriesCounts = new Map();
        for (const s of detected) {
            const key = seriesKey(s.detectionKey);
            seriesCounts.set(key, (seriesCounts.get(key) || 0) + 1);
        }
        const existingSeries = new Map(
            detected
                .filter((s) => seriesCounts.get(seriesKey(s.detectionKey)) === 1)
                .map((s) => [seriesKey(s.detectionKey), s])
        );
        const matchedIds = new Set();

        let created = 0;
        let updated = 0;
        let priceChanges = 0;

        for (const candidate of candidates) {
            const { transactions: groupTxns, ...subFields } = candidate;

            let subscription;
            let isNew = false;

            let match = existingKeys.get(candidate.detectionKey);
            if (!match) {
                const fallback = existingSeries.get(seriesKey(candidate.detectionKey));
                if (fallback && !matchedIds.has(fallback.id)) match = fallback;
            }

            if (match) {
                // Keep the derived fields fresh (amount/next date can move) but
                // never clobber a user's manual edits to name/status.
                const changes = {
                    amount: subFields.amount,
                    nextPaymentDate: subFields.nextPaymentDate,
                    confidence: subFields.confidence,
                    detectionKey: subFields.detectionKey,
                };
                await subscriptionRepo.update(userId, match.id, changes);
                subscription = match;
                matchedIds.add(match.id);
                updated += 1;
            } else {
                const sub = await subscriptionRepo.create(userId, {
                    name: subFields.name,
                    amount: subFields.amount,
                    billingCycle: subFields.billingCycle,
                    nextPaymentDate: subFields.nextPaymentDate,
                    status: 'Active',
                    source: 'anz-detected',
                    detectionKey: subFields.detectionKey,
                    confidence: subFields.confidence,
                    createdAt: new Date().toISOString(),
                });
                subscription = sub;
                isNew = true;
                existingKeys.set(candidate.detectionKey, sub);
                matchedIds.add(sub.id);
                created += 1;
            }

            const knownPayments = isNew
                ? []
                : await subscriptionRepo.listPayments(userId, subscription.id);
            const knownIds = new Set(knownPayments.map((p) => p.id));

            // Record the matched charges as payment history, keyed by the bank
            // transaction id so re-syncing updates rather than duplicates.
            const charges = new Map(knownPayments.map((p) => [p.id, p]));
            for (const txn of groupTxns) {
                const payment = { date: txn.bookedAt.slice(0, 10), amount: txn.amount };
                await subscriptionRepo.upsertPayment(
                    userId,
                    subscription.id,
                    txn.transactionId,
                    payment
                );
                charges.set(txn.transactionId, { id: txn.transactionId, ...payment });
            }

            // Only charges we have not seen before can raise an alert, so a
            // re-sync is silent. A newly detected subscription's history is a
            // baseline: only its latest charge is checked, and never its first.
            const newChargeIds = isNew
                ? [groupTxns[groupTxns.length - 1].transactionId]
                : groupTxns
                      .map((t) => t.transactionId)
                      .filter((id) => !knownIds.has(id));

            const alerts = await priceAlertService.recordPriceChanges(
                userId,
                { ...subscription, source: subscription.source || 'anz-detected' },
                findPriceChanges([...charges.values()], newChargeIds)
            );
            priceChanges += alerts.length;
        }

        return { detected: candidates.length, created, updated, priceChanges };
    },
};

export default subscriptionDetectionService;
