import priceAlertRepo from '../repositories/priceAlertRepo.js';

/**
 * Flags subscription charges that differ from the charge before them, so the
 * user can catch billing errors and price hikes.
 *
 * findPriceChanges is a pure function of a subscription's charges; the service
 * methods wrap it with the Firestore reads and writes. Both manually logged
 * payments and bank-synced charges go through the same comparison.
 */

/** Compares in whole cents so float noise never reads as a price change. */
function toCents(amount) {
    return Math.round(Number(amount) * 100);
}

/**
 * Pure detection. Given every charge for one subscription ({ id, date, amount })
 * and the ids of the charges just recorded, returns a price change for each
 * new charge whose amount differs from the charge immediately before it.
 *
 * A charge with nothing before it — the first payment of a new subscription —
 * has no previous amount to compare against, so it is never flagged.
 */
export function findPriceChanges(charges, newChargeIds) {
    const newIds = new Set(newChargeIds);
    // Oldest first; on a same-day tie the just-recorded charge goes last so it
    // is compared against the charge that already existed.
    const sorted = [...charges].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return Number(newIds.has(a.id)) - Number(newIds.has(b.id));
    });

    const changes = [];

    for (let i = 1; i < sorted.length; i += 1) {
        const charge = sorted[i];
        if (!newIds.has(charge.id)) continue;

        const previous = sorted[i - 1];
        if (toCents(previous.amount) === toCents(charge.amount)) continue;

        changes.push({
            paymentId: charge.id,
            paymentDate: charge.date,
            previousAmount: Number(previous.amount),
            newAmount: Number(charge.amount),
        });
    }

    return changes;
}

const priceAlertService = {
    /**
     * Persists one alert per detected change. Alerts are keyed by the charge
     * they were raised for, so running detection over the same charge again
     * (e.g. a bank re-sync) never duplicates or re-opens an alert.
     */
    async recordPriceChanges(userId, subscription, changes) {
        const created = [];

        for (const change of changes) {
            const alert = await priceAlertRepo.createIfAbsent(
                userId,
                `${subscription.id}_${change.paymentId}`,
                {
                    subscriptionId: subscription.id,
                    subscriptionName: subscription.name,
                    source: subscription.source || 'manual',
                    previousAmount: change.previousAmount,
                    newAmount: change.newAmount,
                    paymentDate: change.paymentDate,
                    dismissed: false,
                    detectedAt: new Date().toISOString(),
                }
            );
            if (alert) created.push(alert);
        }

        return created;
    },

    async listActiveAlerts(userId, subscriptionId) {
        const alerts = await priceAlertRepo.listActive(userId);
        return alerts
            .filter((alert) => !subscriptionId || alert.subscriptionId === subscriptionId)
            .sort((a, b) => (a.paymentDate < b.paymentDate ? 1 : -1));
    },

    async dismissAlert(userId, alertId) {
        const alert = await priceAlertRepo.getById(userId, alertId);
        if (!alert) {
            throw new Error('Price alert not found');
        }
        return await priceAlertRepo.update(userId, alertId, {
            dismissed: true,
            dismissedAt: new Date().toISOString(),
        });
    },

    async removeAlertsForSubscription(userId, subscriptionId) {
        await priceAlertRepo.removeBySubscription(userId, subscriptionId);
    },
};

export default priceAlertService;
