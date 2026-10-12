/**
 * Turns price change announcements from subscription providers (e.g. "your
 * price is changing" emails) into price alerts. Pure function: plain data in,
 * the new alerts to create out. No Firestore or network calls.
 */
export function findProviderPriceAlerts(subscriptions, announcements, existingAlerts) {
    const alerts = [];

    for (const announcement of announcements) {
        const subscription = subscriptions.find((sub) => sub.name === announcement.merchant);
        if (!subscription) continue;
        if (announcement.newAmount === subscription.amount) continue;
        if (existingAlerts.some((alert) => alert.announcementId === announcement.id)) continue;

        alerts.push({
            subscriptionId: subscription.id,
            subscriptionName: subscription.name,
            previousAmount: subscription.amount,
            newAmount: announcement.newAmount,
            effectiveDate: announcement.effectiveDate,
            announcementId: announcement.id,
        });
    }

    return alerts;
}
