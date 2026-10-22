import {
  calculateOverBudgetAmount,
  calculateTotalMonthlySpend,
  isNearBudgetLimit,
  normalizeBudgetToMonthly,
} from '../utils/budgetCalculations.js'

import { formatCurrency } from '../utils/formatCurrency.js'
import {
  classifySubscriptionAlerts,
  groupNewSubscriptions,
} from '../utils/alertRules.js'
import { useDismissedAlerts } from './useDismissedAlerts.js'
import { useTranslations } from './useTranslations.js'

const ALERT_TEXT = [
  "You've spent",
  'of your',
  'monthly budget',
  "That's",
  'over budget.',
  'cancelled subscription',
  'cancelled subscriptions',
  'payment may have failed. It was due',
  "but hasn't shown up in your bank.",
  'free trial ends',
  'payment of',
  'is due',
  'New subscription found in your email:',
  'new subscriptions found in your email.',
]

// Most urgent first: red (failed payments, over budget), orange (trials ending), blue.
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
  pendingSubscriptions = [],
) {
  const [
    youveSpentText,
    ofYourText,
    monthlyBudgetText,
    thatsText,
    overBudgetText,
    cancelledSubscriptionText,
    cancelledSubscriptionsText,
    mayHaveFailedText,
    notInBankText,
    freeTrialEndsText,
    paymentOfText,
    isDueText,
    newSubscriptionText,
    newSubscriptionsText,
  ] = useTranslations(ALERT_TEXT)

  const { dismissed, dismiss } =
    useDismissedAlerts()

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

  const overBudgetAmount =
    calculateOverBudgetAmount(
      totalMonthlySpend,
      budget,
    )

  const showMoney = (amount) =>
    formatCurrency(
      (Number(amount) || 0) * rate,
      preferredCurrency,
    )

  // Each alert is { id, kind, level, message, subscriptionId? }, plus
  // `subscriptions` on a grouped new-subscriptions alert, where level
  // is 'red', 'orange' or 'blue' (see utils/alertRules.js). Ids include the
  // date or month an alert is about, so a dismissed one comes back next time.
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
        id: `${kind}-${subscription.id}-${date}`,
        kind,
        level,
        message,
        subscriptionId: subscription.id,
      }
    },
  )

  // Email finds waiting in Pending, answered with Confirm / Reject. Several
  // at once share one "N new subscriptions found" alert.
  for (const group of groupNewSubscriptions(
    pendingSubscriptions,
  )) {
    if (group.kind === 'newSubscription') {
      const { subscription } = group

      alerts.push({
        id: `newSubscription-${subscription.id}`,
        kind: 'newSubscription',
        level: 'blue',
        message: `${newSubscriptionText} ${subscription.name}, ${showMoney(
          subscription.amount,
        )} / ${subscription.billingCycle}.`,
        subscriptionId: subscription.id,
      })
    } else {
      alerts.push({
        id: 'newSubscriptions',
        kind: 'newSubscriptions',
        level: 'blue',
        message: `${group.subscriptions.length} ${newSubscriptionsText}`,
        subscriptions: group.subscriptions,
      })
    }
  }

  if (nearBudgetLimit) {
    const monthlyBudget =
      normalizeBudgetToMonthly(
        budget.amount,
        budget.period,
      )

    const now = new Date()
    const month = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, '0')}`

    // Going over gets its own id, so dismissing the near-limit note
    // doesn't also hide the over-budget one.
    alerts.push({
      id: `${
        overBudgetAmount > 0 ? 'budgetOver' : 'budget'
      }-${month}`,
      kind: 'budget',
      level: overBudgetAmount > 0 ? 'red' : 'blue',
      message: `${youveSpentText} ${showMoney(
        totalMonthlySpend,
      )} ${ofYourText} ${showMoney(
        monthlyBudget,
      )} ${monthlyBudgetText}${
        overBudgetAmount > 0
          ? `. ${thatsText} ${showMoney(
              overBudgetAmount,
            )} ${overBudgetText}`
          : ''
      }`,
    })
  }

  const cancelledCount =
    subscriptions.length -
    activeSubscriptions.length

  if (cancelledCount > 0) {
    alerts.push({
      id: `cancelled-${cancelledCount}`,
      kind: 'cancelled',
      level: 'blue',
      message: `${cancelledCount} ${
        cancelledCount === 1
          ? cancelledSubscriptionText
          : cancelledSubscriptionsText
      }`,
    })
  }

  const visibleAlerts = alerts
    .filter(
      (alert) =>
        !dismissed.includes(alert.id),
    )
    .sort(
      (a, b) =>
        LEVEL_ORDER[a.level] -
        LEVEL_ORDER[b.level],
    )

  return {
    alerts: visibleAlerts,
    dismissAlert: dismiss,
    activeSubscriptions,
    totalMonthlySpend,
    nearBudgetLimit,
    overBudgetAmount,
  }
}