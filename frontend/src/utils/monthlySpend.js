import { normalizeSubscriptionToMonthly } from './budgetCalculations.js'

/**
 * Extracts a Date from a transaction/payment, whether it's bank-synced
 * (bookedAt) or manually added / a subscription payment (date).
 */
function getTransactionDate(transaction) {
  const raw = transaction.bookedAt || transaction.date
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Total spend for a given year/month (0-indexed, matching JS Date).
 * Bank transactions only count as spend when direction is 'debit'
 * (credits/refunds are excluded). Manually added transactions and
 * subscription payments have no direction field and are assumed to
 * all be spend.
 */
export function calculateMonthSpend(transactions, year, month) {
  return transactions.reduce((total, txn) => {
    const date = getTransactionDate(txn)
    if (!date) return total
    if (date.getFullYear() !== year || date.getMonth() !== month) return total
    if (txn.direction === 'credit') return total
    return total + Math.abs(Number(txn.amount) || 0)
  }, 0)
}

/**
 * Monthly-equivalent total for active subscriptions, for a given
 * year/month. For each subscription:
 * - excluded entirely if not Active (no cancelledAt field exists to
 *   know when a cancelled one actually stopped)
 * - excluded if created after the given month (so a subscription
 *   added this month isn't retroactively counted toward last month)
 * - if real payments were logged against it for that specific month
 *   (via its detail page), those actual amounts are used instead of
 *   the estimate, to avoid double-counting real data with a guess
 * - otherwise falls back to the amount/billingCycle estimate
 *
 * paymentsBySubscriptionId: { [subscriptionId]: payment[] }
 */
export function calculateSubscriptionTotalForMonth(subscriptions, paymentsBySubscriptionId, year, month) {
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999)

  return subscriptions.reduce((total, s) => {
    const payments = paymentsBySubscriptionId[s.id] || []
    const paymentsThisMonth = payments.filter((p) => {
      const date = getTransactionDate(p)
      return date && date.getFullYear() === year && date.getMonth() === month
    })

    // A real, dated payment is ground truth — count it for the month it
    // actually happened in, regardless of the subscription's current
    // status or when it was created. This matters for backdated payments
    // (e.g. logging a payment for last month) and for subscriptions that
    // have since been cancelled but genuinely were paid for in the past.
    if (paymentsThisMonth.length > 0) {
      const actual = paymentsThisMonth.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      return total + actual
    }

    // No real payment data for this month — fall back to the estimate,
    // but only if the subscription was actually active and existed by
    // this month.
    const isActive = s.status?.toLowerCase() === 'active'
    const existedByThisMonth = !s.createdAt || (() => {
      const created = new Date(s.createdAt)
      return !Number.isNaN(created.getTime()) && created <= endOfMonth
    })()

    if (isActive && existedByThisMonth) {
      return total + normalizeSubscriptionToMonthly(s.amount, s.billingCycle)
    }

    return total
  }, 0)
}

/**
 * Returns { currentMonth, previousMonth, percentChange, isIncrease }
 * comparing this calendar month's spend to last calendar month's.
 *
 * transactions: general bank-synced + manually added transactions
 * (NOT subscription payments - those are handled separately via
 * paymentsBySubscriptionId to avoid double-counting with the
 * subscription estimate).
 */
export function compareMonthToPrevious(transactions, subscriptions = [], paymentsBySubscriptionId = {}, referenceDate = new Date()) {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()

  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year

  const currentMonth =
    calculateMonthSpend(transactions, year, month) +
    calculateSubscriptionTotalForMonth(subscriptions, paymentsBySubscriptionId, year, month)

  const previousMonth =
    calculateMonthSpend(transactions, prevYear, prevMonth) +
    calculateSubscriptionTotalForMonth(subscriptions, paymentsBySubscriptionId, prevYear, prevMonth)

  const percentChange = previousMonth > 0
    ? ((currentMonth - previousMonth) / previousMonth) * 100
    : null

  return {
    currentMonth,
    previousMonth,
    percentChange,
    isIncrease: currentMonth > previousMonth,
  }
}