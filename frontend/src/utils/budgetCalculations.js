const NEAR_LIMIT_THRESHOLD = 0.8

export function normalizeSubscriptionToMonthly(amount, billingCycle) {
  switch (billingCycle) {
    case 'Yearly':
      return amount / 12
    case 'Quarterly':
      return amount / 3
    case 'Weekly':
      return (amount * 52) / 12
    case 'Monthly':
    default:
      return amount
  }
}

export function normalizeBudgetToMonthly(amount, period) {
  switch (period) {
    case 'Yearly':
      return amount / 12
    case 'Weekly':
      return (amount * 52) / 12
    case 'Monthly':
    default:
      return amount
  }
}

export function calculateTotalMonthlySpend(subscriptions) {
  return subscriptions
    .filter((subscription) => subscription.status === 'Active')
    .reduce(
      (total, subscription) =>
        total + normalizeSubscriptionToMonthly(subscription.amount, subscription.billingCycle),
      0
    )
}

export function isNearBudgetLimit(totalMonthlySpend, budget) {
  if (!budget || !budget.amount) {
    return false
  }

  const monthlyBudget = normalizeBudgetToMonthly(budget.amount, budget.period)
  return totalMonthlySpend >= monthlyBudget * NEAR_LIMIT_THRESHOLD
}