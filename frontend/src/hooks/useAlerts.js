import {
  calculateTotalMonthlySpend,
  isNearBudgetLimit,
  normalizeBudgetToMonthly,
} from '../utils/budgetCalculations.js'

import { formatCurrency } from '../utils/formatCurrency.js'
import { useTranslations } from './useTranslations.js'

const ALERT_TEXT = [
  "You've spent",
  'of your',
  'monthly budget',
  'cancelled subscription',
  'cancelled subscriptions',
]

export function useAlerts(
  subscriptions,
  budget,
  preferredCurrency,
  rate,
) {
  const [
    youveSpentText,
    ofYourText,
    monthlyBudgetText,
    cancelledSubscriptionText,
    cancelledSubscriptionsText,
  ] = useTranslations(ALERT_TEXT)

  const activeSubscriptions =
    subscriptions.filter(
      (subscription) =>
        subscription.status?.toLowerCase() !==
        'cancelled',
    )

  const totalMonthlySpend =
    calculateTotalMonthlySpend(
      subscriptions,
    )

  const nearBudgetLimit =
    isNearBudgetLimit(
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
      `${youveSpentText} ${showMoney(
        totalMonthlySpend,
      )} ${ofYourText} ${showMoney(
        monthlyBudget,
      )} ${monthlyBudgetText}`,
    )
  }

  const cancelledCount =
    subscriptions.length -
    activeSubscriptions.length

  if (cancelledCount > 0) {
    alerts.push(
      `${cancelledCount} ${
        cancelledCount === 1
          ? cancelledSubscriptionText
          : cancelledSubscriptionsText
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