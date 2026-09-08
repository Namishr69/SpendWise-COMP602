import { calculateTotalMonthlySpend, isNearBudgetLimit, normalizeBudgetToMonthly } from '../utils/budgetCalculations.js'
import { formatCurrency } from '../utils/formatCurrency.js'

export function useAlerts(subscriptions, budget, preferredCurrency) {
  const activeSubscriptions = subscriptions.filter(
    (s) => s.status?.toLowerCase() !== 'cancelled',
  )

  const totalMonthlySpend = calculateTotalMonthlySpend(subscriptions)
  const nearBudgetLimit = isNearBudgetLimit(totalMonthlySpend, budget)

  const alerts = []
  if (nearBudgetLimit) {
    const monthlyBudget = normalizeBudgetToMonthly(budget.amount, budget.period)
    alerts.push(
      `You've spent ${formatCurrency(totalMonthlySpend, preferredCurrency)} of your ${formatCurrency(monthlyBudget, preferredCurrency)} monthly budget`,
    )
  }

  const cancelledCount = subscriptions.length - activeSubscriptions.length
  if (cancelledCount > 0) {
    alerts.push(`${cancelledCount} cancelled subscription${cancelledCount > 1 ? 's' : ''}`)
  }

  return { alerts, activeSubscriptions, totalMonthlySpend, nearBudgetLimit }
}