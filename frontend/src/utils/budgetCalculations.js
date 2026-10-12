const NEAR_LIMIT_THRESHOLD = 0.8

export function normalizeSubscriptionToMonthly(amount, billingCycle) {
  switch (billingCycle) {
    // 'Annually' and 'Yearly' are both in use — detection emits the former,
    // the add-subscription form the latter.
    case 'Yearly':
    case 'Annually':
      return amount / 12
    case 'Quarterly':
      return amount / 3
    case 'Fortnightly':
      return (amount * 26) / 12
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