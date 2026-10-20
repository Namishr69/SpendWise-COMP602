/**
 * Review state of an auto-detected subscription, mirroring
 * backend/src/services/subscriptionReview.js.
 *
 * A subscription found only in an email receipt waits in "Pending" until the
 * user confirms or rejects it. Email-detected records saved before this
 * existed have no reviewStatus, so a missing value on one of those also means
 * pending. Rejected records stay hidden.
 */
export function isPendingReview(subscription) {
  return subscription.source === 'gmail-detected' && !subscription.reviewStatus
}

export function countsAsSubscription(subscription) {
  return !isPendingReview(subscription) && subscription.reviewStatus !== 'rejected'
}
