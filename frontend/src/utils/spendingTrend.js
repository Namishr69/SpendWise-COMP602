import { calculateMonthSpend, calculateSubscriptionTotalForMonth } from './monthlySpend.js'

const MAX_MONTHS_BACK = 12 // reasonable cap so the chart doesn't stretch forever

function getTransactionDate(transaction) {
  const raw = transaction.bookedAt || transaction.date
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Finds the earliest month with any real activity (a transaction, a
 * subscription payment, or a subscription's creation date), capped at
 * MAX_MONTHS_BACK before the current month. Falls back to the current
 * month alone if there's no activity at all, so the chart always has
 * at least one point instead of being empty.
 */
function findEarliestActivityMonth(transactions, subscriptions, referenceDate) {
  const dates = []

  transactions.forEach((t) => {
    const d = getTransactionDate(t)
    if (d) dates.push(d)
  })

  subscriptions.forEach((s) => {
    if (s.createdAt) {
      const d = new Date(s.createdAt)
      if (!Number.isNaN(d.getTime())) dates.push(d)
    }
  })

  const earliestCap = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - (MAX_MONTHS_BACK - 1), 1)

  if (dates.length === 0) {
    return { year: referenceDate.getFullYear(), month: referenceDate.getMonth() }
  }

  const earliest = dates.reduce((min, d) => (d < min ? d : min), dates[0])
  const bounded = earliest < earliestCap ? earliestCap : earliest

  return { year: bounded.getFullYear(), month: bounded.getMonth() }
}

/**
 * Returns an array of { label, year, month, total }, one entry per
 * month from the earliest real activity up to the current month
 * (oldest first) - suitable for a line/bar chart. If there's no
 * activity at all, returns a single point for the current month.
 */
export function getMonthlyTotals(transactions, subscriptions, paymentsBySubscriptionId, referenceDate = new Date()) {
  const { year: startYear, month: startMonth } = findEarliestActivityMonth(transactions, subscriptions, referenceDate)

  const endYear = referenceDate.getFullYear()
  const endMonth = referenceDate.getMonth()

  const results = []
  let year = startYear
  let month = startMonth

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const total =
      calculateMonthSpend(transactions, year, month) +
      calculateSubscriptionTotalForMonth(subscriptions, paymentsBySubscriptionId, year, month)

    const label = new Date(year, month, 1).toLocaleDateString('en-NZ', { month: 'short', year: '2-digit' })

    results.push({ label, year, month, total })

    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }

  return results
}