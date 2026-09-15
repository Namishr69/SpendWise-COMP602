import {
  calculateTotalMonthlySpend,
  isNearBudgetLimit,
  normalizeBudgetToMonthly,
} from '../utils/budgetCalculations.js'

import { formatCurrency } from '../utils/formatCurrency.js'

export function useAlerts(
  subscriptions,
  budget,
  preferredCurrency,
  rate,
) {
  const activeSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.status?.toLowerCase() !== 'cancelled',
  )

  const totalMonthlySpend =
    calculateTotalMonthlySpend(subscriptions)

  const nearBudgetLimit = isNearBudgetLimit(
    totalMonthlySpend,
    budget,
  )

  const showMoney = (amount) =>
    formatCurrency(
      (Number(amount) || 0) * rate,
      preferredCurrency,
    )

  const alerts = []

  if (nearBudgetLimit) {
    const monthlyBudget =
      normalizeBudgetToMonthly(
        budget.amount,
        budget.period,
      )

    alerts.push(
      `You've spent ${showMoney(
        totalMonthlySpend,
      )} of your ${showMoney(
        monthlyBudget,
      )} monthly budget`,
    )
  }

  const cancelledCount =
    subscriptions.length -
    activeSubscriptions.length

  if (cancelledCount > 0) {
    alerts.push(
      `${cancelledCount} cancelled subscription${
        cancelledCount > 1 ? 's' : ''
      }`,
    )
  }

  return {
    alerts,
    activeSubscriptions,
    totalMonthlySpend,
    nearBudgetLimit,
  }
}