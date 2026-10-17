/**
 * Pure subscription-detection logic: finds recurring payments hidden in a list
 * of bank transactions. This module has no I/O and no imports, which is what
 * makes it straightforward to unit test. The Firestore reads/writes that turn
 * these candidates into stored subscriptions live in subscriptionDetectionService.
 *
 * There are two ways a recurring payment shows up in a bank feed, and both are
 * handled here:
 *
 *   1. *Declared* — a scheduled payment or direct debit. ANZ returns this as a
 *      single record that states its own frequency. One record is enough: it is
 *      recurring by definition and can never reach an occurrence threshold.
 *   2. *Inferred* — the same charge recurring over time (a card subscription,
 *      say). These are grouped by merchant and amount, and need at least two
 *      occurrences on a regular cadence.
 */

const MIN_OCCURRENCES = 2;

const CADENCES = [
    { cycle: 'Weekly', minDays: 0, maxDays: 9, periodDays: 7 },
    { cycle: 'Fortnightly', minDays: 12, maxDays: 16, periodDays: 14 },
    { cycle: 'Monthly', minDays: 26, maxDays: 35, periodDays: 30 },
    { cycle: 'Quarterly', minDays: 84, maxDays: 96, periodDays: 91 },
    { cycle: 'Annually', minDays: 350, maxDays: 380, periodDays: 365 },
];

// Every cycle string this module can emit. The frontend's monthly normaliser
// (frontend/src/utils/budgetCalculations.js) must understand all of them or a
// subscription's cost is silently mis-scaled.
const DEFAULT_CYCLE = 'Monthly';

// Record types that declare their own recurrence.
const DECLARED_RECORD_TYPES = new Set(['scheduledPayment', 'directDebit']);

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

function cadenceForCycle(cycle) {
    return CADENCES.find((c) => c.cycle === cycle) || CADENCES[2];
}

function addDays(isoDate, days) {
    const date = new Date(isoDate);
    date.setDate(date.getDate() + days);
    return date.toISOString();
}

/** A `YYYY-MM-DD` string from anything date-like, or null when unusable. */
function toDateOnly(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

/**
 * Maps a bank's declared frequency onto one of our cycle names.
 *
 * Deliberately forgiving: ANZ sandbox sends free text ("Monthly", "monthly
 * payment"), OBIE standing orders send ISO-20022 style codes, and both appear in
 * the wild. Anything unrecognised returns null rather than a guess, so the
 * caller can decide whether to fall back.
 */
export function frequencyToCycle(frequency) {
    if (typeof frequency !== 'string') return null;

    const value = frequency.toLowerCase();
    if (!value.trim()) return null;

    // Order matters: the tighter patterns are tested before the looser ones,
    // so 'quarterly' is never swallowed by a stray 'ly' rule.
    if (/fortn|frtn|bi-?week|2\s*week|twice\s*a\s*month|semi-?month/.test(value)) {
        return 'Fortnightly';
    }
    if (/quart|qtr|\bq[1-4]\b|3\s*month|every\s*three\s*month/.test(value)) {
        return 'Quarterly';
    }
    if (/annual|annum|\byearly|\byear\b|12\s*month|every\s*year/.test(value)) {
        return 'Annually';
    }
    if (/week|wk|wkly|every\s*7/.test(value)) {
        return 'Weekly';
    }
    if (/month|mnth|mth|monthly/.test(value)) {
        return DEFAULT_CYCLE;
    }

    return null;
}

/** The stable key a candidate is identified by. Never derived from a raw id. */
function detectionKeyFor(merchantKey, bucket, cycle) {
    return `${merchantKey}|${bucket}|${cycle}`;
}

/**
 * The key for a *declared* arrangement.
 *
 * A bank mandate id is the one identifier that genuinely distinguishes two
 * recurring payments, so a declared candidate keeps its own mandate in the key.
 * This is what stops four different standing arrangements of the same amount to
 * the same payee collapsing onto one key — before this, the first candidate
 * created a document and the other three "updated" it, so only one of four ever
 * appeared on the Subscriptions page.
 *
 * Namespaced with `declared:` so it can never collide with the plain
 * merchant|bucket|cycle key an inferred candidate uses for the same merchant.
 */
function declaredDetectionKeyFor(mandateId, merchantKey, bucket, cycle) {
    const discriminator = mandateId ? `mandate:${mandateId}` : merchantKey;
    return `declared:${discriminator}|${bucket}|${cycle}`;
}

/**
 * Builds a candidate from a group of declared records (scheduled payments /
 * direct debits). One record is enough — the bank already told us it recurs.
 */
function declaredCandidate(records) {
    const sorted = [...records].sort((a, b) =>
        a.bookedAt < b.bookedAt ? -1 : 1
    );
    const last = sorted[sorted.length - 1];

    // The most recent record's own fields win: if a mandate was edited, the
    // latest version is the true one.
    const statedFrequency =
        [...sorted].reverse().find((r) => r.frequency)?.frequency || null;
    const statedNextDate = [...sorted].reverse().find((r) => r.declaredNextDate)
        ?.declaredNextDate;

    const parsedCycle = frequencyToCycle(statedFrequency);
    const cycle = parsedCycle || DEFAULT_CYCLE;
    const cadence = cadenceForCycle(cycle);

    const nextPaymentDate =
        toDateOnly(statedNextDate) || addDays(last.bookedAt, cadence.periodDays).slice(0, 10);

    return {
        name: (last.merchant || last.description || 'Subscription').trim(),
        amount: Number(Number(last.amount).toFixed(2)),
        currency: last.currency || 'NZD',
        billingCycle: cycle,
        nextPaymentDate,
        // A stated frequency that we understood is strong evidence; a defaulted
        // cycle is still a real recurring arrangement, just a weaker guess.
        confidence: parsedCycle ? 0.8 : 0.6,
        transactions: sorted,
    };
}

/**
 * Pure detection. Given transactions, returns candidate subscriptions with the
 * transactions that make up each one. No I/O.
 */
export function detectRecurring(transactions) {
    // Only outgoing payments can be subscriptions.
    const debits = transactions.filter((t) => t.direction === 'debit');

    const declared = debits.filter((t) => DECLARED_RECORD_TYPES.has(t.recordType));
    const plain = debits.filter((t) => !DECLARED_RECORD_TYPES.has(t.recordType));

    const candidates = [];
    // Plain merchant|bucket|cycle keys already covered, so the inferred pass
    // never re-emits what a declared record has already described. Kept in the
    // plain form because that is what pass 2 computes; a declared candidate's
    // own key is namespaced and would never match it.
    const claimedKeys = new Set();

    // --- Pass 1: declared recurring arrangements -----------------------------
    // Grouped by the bank's mandate id where there is one, so two distinct
    // mandates of equal amount stay separate; otherwise by merchant + amount.
    const declaredGroups = new Map();
    for (const txn of declared) {
        const merchantKey = normaliseMerchant(txn.merchant || txn.description);
        if (!merchantKey) continue;

        const bucket = amountBucket(txn.amount);
        const key = txn.mandateId
            ? `mandate:${txn.mandateId}`
            : `${merchantKey}|${bucket}`;

        if (!declaredGroups.has(key)) declaredGroups.set(key, []);
        declaredGroups.get(key).push(txn);
    }

    for (const records of declaredGroups.values()) {
        const candidate = declaredCandidate(records);
        // A declared record with no usable amount would render as a "$0.00"
        // subscription; there is nothing to track, so skip it.
        if (!(candidate.amount >= 0)) continue;

        const merchantKey = normaliseMerchant(candidate.name);
        const bucket = amountBucket(candidate.amount);
        const mandateId = records.find((r) => r.mandateId)?.mandateId || null;

        candidates.push({
            ...candidate,
            detectionKey: declaredDetectionKeyFor(
                mandateId,
                merchantKey,
                bucket,
                candidate.billingCycle
            ),
            // The key an earlier version of this code would have stored for this
            // arrangement (before mandate ids were kept). The persistence layer
            // uses it to retire a doc the old scheme created, so upgrading does
            // not leave a duplicate beside the new one.
            legacyDetectionKey: detectionKeyFor(
                merchantKey,
                bucket,
                candidate.billingCycle
            ),
            source: 'declared',
        });
        claimedKeys.add(detectionKeyFor(merchantKey, bucket, candidate.billingCycle));
    }

    // --- Pass 2: inferred patterns -------------------------------------------
    const groups = new Map();
    for (const txn of plain) {
        const merchantKey = normaliseMerchant(txn.merchant || txn.description);
        if (!merchantKey) continue;
        const key = `${merchantKey}|${amountBucket(txn.amount)}`;

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(txn);
    }

    for (const [groupKey, groupTxns] of groups) {
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
        if (!(latestAmount >= 0)) continue;

        const detectionKey = detectionKeyFor(
            groupKey.split('|')[0],
            amountBucket(latestAmount),
            cadence.cycle
        );

        // Already covered by a declared arrangement — emitting again would put
        // two cards on the page for one subscription.
        if (claimedKeys.has(detectionKey)) continue;

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
            detectionKey,
            name: (last.merchant || last.description || 'Subscription').trim(),
            amount: Number(latestAmount.toFixed(2)),
            currency: last.currency || 'NZD',
            billingCycle: cadence.cycle,
            nextPaymentDate: addDays(last.bookedAt, cadence.periodDays).slice(0, 10),
            confidence: Number(confidence.toFixed(2)),
            transactions: sorted,
            source: 'inferred',
        });
        claimedKeys.add(detectionKey);
    }

    return candidates;
}

export default { detectRecurring, frequencyToCycle };
