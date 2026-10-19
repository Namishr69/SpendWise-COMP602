/**
 * Review state of an auto-detected subscription.
 *
 * A subscription found only in an email receipt waits in a "Pending" list
 * until the user confirms or rejects it, and only counts once confirmed.
 * Email-detected records saved before this existed have no reviewStatus, so a
 * missing value on one of those also means pending.
 *
 *   reviewStatus  undefined | 'confirmed' | 'rejected'
 *
 * A rejected record is kept rather than deleted, so the next inbox scan finds
 * it by detectionKey and does not recreate it.
 */
export const REVIEW_STATUSES = ['confirmed', 'rejected'];

export function isPendingReview(subscription) {
    return subscription.source === 'gmail-detected' && !subscription.reviewStatus;
}

export function countsAsSubscription(subscription) {
    return !isPendingReview(subscription) && subscription.reviewStatus !== 'rejected';
}
