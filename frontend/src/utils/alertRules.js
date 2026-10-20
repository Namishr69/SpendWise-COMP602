/**
 * Which subscriptions need an alert, and how urgent each one is.
 *
 *   red     overdue      a bank-detected payment is OVERDUE_DAYS+ past its
 *                        date without the sync moving it on, so the charge
 *                        never arrived and may have failed
 *   orange  trialEnding  a free trial ends within TRIAL_WARNING_DAYS
 *   blue    dueSoon      a payment falls due within DUE_SOON_DAYS
 *
 * Only bank-detected payments can be "overdue": the bank sync rolls their
 * next payment date forward when a charge lands, while manual and email
 * subscriptions keep whatever date was last saved.
 *
 * Only active subscriptions are checked, and each gets just its most urgent
 * alert (a trial ending on its first payment date is one alert, not two).
 */
export const OVERDUE_DAYS = 2
export const TRIAL_WARNING_DAYS = 7
export const DUE_SOON_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

// Whole days from today to a 'YYYY-MM-DD' date (or the date part of an ISO
// timestamp); negative once it has passed, null when there's no usable date.
export function daysUntil(date, now = new Date()) {
  if (!date) return null

  const [year, month, day] = String(date)
    .slice(0, 10)
    .split('-')
    .map(Number)

  if (!year || !month || !day) return null

  const target = Date.UTC(year, month - 1, day)
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())

  return Math.round((target - today) / DAY_MS)
}

function isActive(subscription) {
  return (subscription.status || 'Active').toLowerCase() === 'active'
}

function classify(subscription, now) {
  const paymentDays = daysUntil(subscription.nextPaymentDate, now)

  if (
    subscription.source === 'anz-detected' &&
    paymentDays !== null &&
    paymentDays <= -OVERDUE_DAYS
  ) {
    return { kind: 'overdue', level: 'red', date: subscription.nextPaymentDate }
  }

  const trialDays = daysUntil(subscription.trialEndDate, now)

  if (
    subscription.isTrial === true &&
    trialDays !== null &&
    trialDays >= 0 &&
    trialDays <= TRIAL_WARNING_DAYS
  ) {
    return { kind: 'trialEnding', level: 'orange', date: subscription.trialEndDate }
  }

  if (
    paymentDays !== null &&
    paymentDays >= 0 &&
    paymentDays <= DUE_SOON_DAYS
  ) {
    return { kind: 'dueSoon', level: 'blue', date: subscription.nextPaymentDate }
  }

  return null
}

// One { kind, level, date, subscription } per subscription that needs an alert.
export function classifySubscriptionAlerts(subscriptions, now = new Date()) {
  return subscriptions
    .filter(isActive)
    .map((subscription) => {
      const alert = classify(subscription, now)
      return alert && { ...alert, subscription }
    })
    .filter(Boolean)
}
