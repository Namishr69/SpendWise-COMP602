/**
 * Extracts a Date from a transaction, whether it's bank-synced
 * (bookedAt) or manually added (date).
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
 * (credits/refunds are excluded). Manually added transactions have
 * no direction field and are assumed to all be spend.
 */
export function calculateMonthSpend(transactions, year, month) {
  return transactions.reduce((total, txn) => {
    const date = getTransactionDate(txn)
    if (!date) return total
    if (date.getFullYear() !== year || date.getMonth() !== month) return total

    const isBankCredit = txn.direction === 'credit'
    if (isBankCredit) return total

    return total + Math.abs(Number(txn.amount) || 0)
  }, 0)
}

/**
 * Returns { currentMonth, previousMonth, percentChange, isIncrease }
 * comparing this calendar month's spend to last calendar month's.
 */
export function compareMonthToPrevious(transactions, referenceDate = new Date()) {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()

  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year

  const currentMonth = calculateMonthSpend(transactions, year, month)
  const previousMonth = calculateMonthSpend(transactions, prevYear, prevMonth)

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