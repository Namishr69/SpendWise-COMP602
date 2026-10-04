import subscriptionRepo from '../repositories/subscriptionRepo.js';
import { detectRecurring } from './subscriptionDetection.js';

/**
 * Turns recurring payments found in a list of bank transactions into stored
 * subscription records.
 *
 * The detection itself (detectRecurring) is a pure function of a transaction
 * array — it lives in ./subscriptionDetection.js so it can be unit tested with
 * no Firestore. detectAndPersist wraps it with the Firestore reads and writes,
 * and is careful to be idempotent: a second sync of the same data must not
 * create a second copy of a subscription.
 */

// Re-exported so existing importers of this module keep working.
export { detectRecurring };

/**
 * TEMPORARY DIAGNOSTIC — remove once subscription detection is confirmed
 * working against live ANZ data.
 *
 * detection returning 0 candidates has two very different causes that look
 * identical from the outside: the feed genuinely contains no repeating payment,
 * or it does and detection is failing to see it. This prints the raw shape of
 * what arrived and a grouping by merchant+amount, so the two are distinguishable
 * from one log line.
 */
function dumpDetectionInput(transactions) {
    const preview = transactions.slice(0, 10).map((t) => ({
        merchant: t.merchant,
        amount: t.amount,
        direction: t.direction,
        recordType: t.recordType || 'transaction',
        bookedAt: typeof t.bookedAt === 'string' ? t.bookedAt.slice(0, 10) : t.bookedAt,
        mandateId: t.mandateId || null,
        frequency: t.frequency || null,
    }));

    console.log('[detection-dump] raw records (first 10):');
    console.table(preview);

    // Group by merchant+amount: any key appearing 2+ times is a series that
    // *could* be a subscription, whether or not detection found it.
    const groups = new Map();
    for (const t of transactions) {
        const key = `${t.merchant} | ${t.amount} | ${t.recordType || 'transaction'}`;
        const existing = groups.get(key) || { key, count: 0, dates: [] };
        existing.count += 1;
        if (typeof t.bookedAt === 'string') existing.dates.push(t.bookedAt.slice(0, 10));
        groups.set(key, existing);
    }

    const repeated = [...groups.values()]
        .filter((g) => g.count >= 2)
        .sort((a, b) => b.count - a.count)
        .map((g) => ({
            group: g.key,
            occurrences: g.count,
            dates: g.dates.sort().join(', '),
        }));

    if (repeated.length === 0) {
        console.log(
            '[detection-dump] NO group of 2+ identical merchant+amount records exists — ' +
                'the feed contains nothing repeating, so 0 candidates is correct for this data.'
        );
    } else {
        console.log('[detection-dump] groups with 2+ occurrences (candidates for detection):');
        console.table(repeated);
    }

    console.log(
        `[detection-dump] totals: records=${transactions.length} ` +
            `debits=${transactions.filter((t) => t.direction === 'debit').length} ` +
            `distinctGroups=${groups.size} repeatedGroups=${repeated.length}`
    );
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
        dumpDetectionInput(transactions);

        const candidates = detectRecurring(transactions);

        // A live sync can only be diagnosed from the log: it says how many rows
        // arrived, how many were outgoing, how many declared themselves
        // recurring, and what survived into subscriptions.
        const debits = transactions.filter((t) => t.direction === 'debit').length;
        const declaredRecurring = transactions.filter(
            (t) => t.recordType === 'scheduledPayment' || t.recordType === 'directDebit'
        ).length;

        if (candidates.length === 0) {
            console.log(
                `[subscription-detection] txns=${transactions.length} debits=${debits} ` +
                    `declaredRecurring=${declaredRecurring} candidates=0 created=0 updated=0`
            );
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
                    billingCycle: subFields.billingCycle,
                };
                await subscriptionRepo.update(userId, match.id, changes);
                subscriptionId = match.id;
                updated += 1;
            } else {
                const sub = await subscriptionRepo.create(userId, {
                    name: subFields.name,
                    amount: subFields.amount,
                    // Never null: the Subscriptions page calls .toLowerCase() on it.
                    billingCycle: subFields.billingCycle || 'Monthly',
                    nextPaymentDate: subFields.nextPaymentDate,
                    status: 'Active',
                    source: 'anz-detected',
                    detectedVia: subFields.source,
                    detectionKey: candidate.detectionKey,
                    confidence: subFields.confidence,
                    createdAt: new Date().toISOString(),
                });
                subscriptionId = sub.id;
                existingKeys.set(candidate.detectionKey, sub);
                created += 1;
            }

            // One-time upgrade: earlier versions keyed declared candidates without
            // the mandate, so several arrangements collapsed into a single doc.
            // Now that each has its own doc, retire the old collapsed one so the
            // page does not show both. Only ever removes an anz-detected doc that
            // is genuinely superseded — a manually-created subscription has no
            // detectionKey and is never touched.
            if (
                candidate.legacyDetectionKey
                && candidate.legacyDetectionKey !== candidate.detectionKey
            ) {
                const legacy = existingKeys.get(candidate.legacyDetectionKey);
                if (legacy && legacy.id !== subscriptionId) {
                    await subscriptionRepo.remove(userId, legacy.id);
                    existingKeys.delete(candidate.legacyDetectionKey);
                }
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

        console.log(
            `[subscription-detection] txns=${transactions.length} debits=${debits} ` +
                `declaredRecurring=${declaredRecurring} candidates=${candidates.length} ` +
                `created=${created} updated=${updated}`
        );

        return { detected: candidates.length, created, updated };
    },
};

export default subscriptionDetectionService;
