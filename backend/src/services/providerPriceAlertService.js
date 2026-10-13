/**
 * Turns price change announcements from subscription providers (e.g. "your
 * price is changing" emails) into price alerts. Pure function: plain data in,
 * the new alerts to create out. No Firestore or network calls.
 */

// Words that appear in sender names and domains but say nothing about which
// provider sent the email, e.g. "NETFLIX.COM" or "Spotify Billing Team".
const NOISE_WORDS = new Set([
    'the', 'com', 'co', 'nz', 'au', 'net', 'org', 'io',
    'inc', 'ltd', 'limited', 'llc',
    'team', 'billing', 'support', 'info', 'mail', 'account', 'accounts',
    'no', 'reply', 'noreply',
]);

// A partial match ("Spotify" → "Spotify Premium") needs at least this many
// characters in common, so short names cannot match half the subscriptions.
const MIN_PARTIAL_LENGTH = 4;

/** Compares in whole cents so float noise never reads as a price change. */
function toCents(amount) {
    return Math.round(Number(amount) * 100);
}

/** Lowercase letters and digits only, with noise words removed. */
function nameKey(name) {
    return String(name || '')
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word && !NOISE_WORDS.has(word))
        .join('');
}

function isCancelled(subscription) {
    const status = String(subscription.status || '').toLowerCase();
    return status === 'cancelled' || status === 'canceled';
}

/**
 * Finds the subscription an announcement is about. An exact name match wins;
 * otherwise one name must start with the other ("Spotify" and "Spotify
 * Premium"). When the partial match is ambiguous ("Apple" against "Apple
 * Music" and "Apple TV") the announcement is ignored rather than guessed at.
 */
function matchSubscription(subscriptions, merchant) {
    const merchantKey = nameKey(merchant);
    if (!merchantKey) return null;

    const candidates = subscriptions
        .filter((sub) => !isCancelled(sub))
        .map((sub) => ({ sub, key: nameKey(sub.name) }))
        .filter(({ key }) => key);

    const exact = candidates.find(({ key }) => key === merchantKey);
    if (exact) return exact.sub;

    const partial = candidates.filter(({ key }) => {
        const [shorter, longer] = key.length < merchantKey.length
            ? [key, merchantKey]
            : [merchantKey, key];
        return shorter.length >= MIN_PARTIAL_LENGTH && longer.startsWith(shorter);
    });

    return partial.length === 1 ? partial[0].sub : null;
}

/**
 * Identifies a price change independently of the email that announced it, so
 * a reminder email about the same change is recognised as a duplicate.
 */
function changeKey(subscriptionId, newAmount, effectiveDate) {
    return `${subscriptionId}|${toCents(newAmount)}|${effectiveDate || ''}`;
}

export function findProviderPriceAlerts(subscriptions, announcements, existingAlerts) {
    const seenAnnouncementIds = new Set(
        existingAlerts.map((alert) => alert.announcementId).filter(Boolean)
    );
    const seenChanges = new Set(
        existingAlerts
            .filter((alert) => alert.type === 'announcement')
            .map((alert) => changeKey(alert.subscriptionId, alert.newAmount, alert.effectiveDate))
    );

    const alerts = [];

    for (const announcement of announcements) {
        if (seenAnnouncementIds.has(announcement.id)) continue;

        const subscription = matchSubscription(subscriptions, announcement.merchant);
        if (!subscription) continue;
        if (toCents(announcement.newAmount) === toCents(subscription.amount)) continue;

        const key = changeKey(subscription.id, announcement.newAmount, announcement.effectiveDate);
        if (seenChanges.has(key)) continue;

        seenAnnouncementIds.add(announcement.id);
        seenChanges.add(key);

        alerts.push({
            type: 'announcement',
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
