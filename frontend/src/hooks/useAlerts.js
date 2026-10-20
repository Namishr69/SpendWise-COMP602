import {
  calculateTotalMonthlySpend,
  isNearBudgetLimit,
  normalizeBudgetToMonthly,
} from '../utils/budgetCalculations.js'

import { formatCurrency } from '../utils/formatCurrency.js'
import { classifySubscriptionAlerts } from '../utils/alertRules.js'
import { useTranslations } from './useTranslations.js'

const ALERT_TEXT = [
  "You've spent",
  'of your',
  'monthly budget',
  'cancelled subscription',
  'cancelled subscriptions',
  'payment may have failed. It was due',
  "but hasn't shown up in your bank.",
  'free trial ends',
  'payment of',
  'is due',
]

// Most urgent first: red (failed payments), orange (trials ending), blue.
const LEVEL_ORDER = {
  red: 0,
  orange: 1,
  blue: 2,
}

// '2026-10-18' -> '18 Oct', read as a local date so the day never shifts.
function formatShortDate(date) {
  const [year, month, day] = String(date)
    .slice(0, 10)
    .split('-')
    .map(Number)

  return new Date(
    year,
    month - 1,
    day,
  ).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
  })
}

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
    mayHaveFailedText,
    notInBankText,
    freeTrialEndsText,
    paymentOfText,
    isDueText,
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

  // Each alert is { id, level, message, subscriptionId? }, where level is
  // 'red', 'orange' or 'blue' (see utils/alertRules.js).
  const alerts = classifySubscriptionAlerts(
    subscriptions,
  ).map(
    ({ kind, level, date, subscription }) => {
      const name = subscription.name
      const when = formatShortDate(date)

      let message

      if (kind === 'overdue') {
        message = `${name} ${mayHaveFailedText} ${when} ${notInBankText}`
      } else if (kind === 'trialEnding') {
        message = `${name} ${freeTrialEndsText} ${when}.`
      } else {
        message = `${name} ${paymentOfText} ${showMoney(
          subscription.amount,
        )} ${isDueText} ${when}.`
      }

      return {
        id: `${kind}-${subscription.id}`,
        level,
        message,
        subscriptionId: subscription.id,
      }
    },
  )

  if (nearBudgetLimit) {
    const monthlyBudget =
      normalizeBudgetToMonthly(
        budget.amount,
        budget.period,
      )

    alerts.push({
      id: 'budget',
      level: 'blue',
      message: `${youveSpentText} ${showMoney(
        totalMonthlySpend,
      )} ${ofYourText} ${showMoney(
        monthlyBudget,
      )} ${monthlyBudgetText}`,
    })
  }

  const cancelledCount =
    subscriptions.length -
    activeSubscriptions.length

  if (cancelledCount > 0) {
    alerts.push({
      id: 'cancelled',
      level: 'blue',
      message: `${cancelledCount} ${
        cancelledCount === 1
          ? cancelledSubscriptionText
          : cancelledSubscriptionsText
      }`,
    })
  }

  alerts.sort(
    (a, b) =>
      LEVEL_ORDER[a.level] -
      LEVEL_ORDER[b.level],
  )

  return {
    alerts,
    activeSubscriptions,
    totalMonthlySpend,
    nearBudgetLimit,
  }
}