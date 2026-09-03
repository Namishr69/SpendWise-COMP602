import subscriptionRepo from '../repositories/subscriptionRepo.js';

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

/**
 * Pure detection. Given transactions, returns candidate subscriptions with the
 * transactions that make up each one. No I/O.
 */
export function detectRecurring(transactions) {
    // Only outgoing payments can be subscriptions.
    const debits = transactions.filter((t) => t.direction === 'debit');

    // Group by (normalised merchant + amount bucket).
    const groups = new Map();
    for (const txn of debits) {
        const merchantKey = normaliseMerchant(txn.merchant || txn.description);
        if (!merchantKey) continue;
        const key = `${merchantKey}|${amountBucket(txn.amount)}`;

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(txn);
    }

    const candidates = [];

    for (const [key, groupTxns] of groups) {
        if (groupTxns.length < MIN_OCCURRENCES) continue;

        const sorted = [...groupTxns].sort((a, b) =>
            a.bookedAt < b.bookedAt ? -1 : 1
        );

        // Gaps between consecutive charges, in days.
        const gaps = [];
        for (let i = 1; i < sorted.length; i += 1) {
            const days =
                (new Date(sorted[i].bookedAt) - new Date(sorted[i - 1].bookedAt)) /
                (1000 * 60 * 60 * 24);
            gaps.push(days);
        }

        const medianGap = median(gaps);
        const cadence = classifyCadence(medianGap);
        if (!cadence) continue;

        const last = sorted[sorted.length - 1];
        const amounts = sorted.map((t) => t.amount);
        const latestAmount = amounts[amounts.length - 1];

        // Confidence: more occurrences and steadier gaps are more convincing.
        const gapConsistency =
            gaps.length > 0
                ? gaps.filter(
                      (g) => g >= cadence.minDays && g <= cadence.maxDays
                  ).length / gaps.length
                : 0;
        const confidence = Math.min(
            1,
            0.5 * gapConsistency + 0.5 * Math.min(1, sorted.length / 6)
        );

        candidates.push({
            detectionKey: `${key}|${cadence.cycle}`,
            name: (last.merchant || last.description || 'Subscription').trim(),
            amount: Number(latestAmount.toFixed(2)),
            currency: last.currency || 'NZD',
            billingCycle: cadence.cycle,
            nextPaymentDate: addDays(last.bookedAt, cadence.periodDays).slice(0, 10),
            confidence: Number(confidence.toFixed(2)),
            transactions: sorted,
        });
    }

    return candidates;
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
            return { detected: 0, created: 0, updated: 0 };
        }

        const existing = await subscriptionRepo.getAll(userId);
        const existingKeys = new Map(
            existing
                .filter((s) => s.detectionKey)
                .map((s) => [s.detectionKey, s])
        );

        let created = 0;
        let updated = 0;

        for (const candidate of candidates) {
            const { transactions: groupTxns, ...subFields } = candidate;

            let subscriptionId;
            const match = existingKeys.get(candidate.detectionKey);

            if (match) {
                // Keep the derived fields fresh (amount/next date can move) but
                // never clobber a user's manual edits to name/status.
                const changes = {
                    amount: subFields.amount,
                    nextPaymentDate: subFields.nextPaymentDate,
                    confidence: subFields.confidence,
                };
                await subscriptionRepo.update(userId, match.id, changes);
                subscriptionId = match.id;
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
                subscriptionId = sub.id;
                existingKeys.set(candidate.detectionKey, sub);
                created += 1;
            }

            // Record the matched charges as payment history, keyed by the bank
            // transaction id so re-syncing updates rather than duplicates.
            for (const txn of groupTxns) {
                await subscriptionRepo.upsertPayment(
                    userId,
                    subscriptionId,
                    txn.transactionId,
                    { date: txn.bookedAt.slice(0, 10), amount: txn.amount }
                );
            }
        }

        return { detected: candidates.length, created, updated };
    },
};

export default subscriptionDetectionService;
