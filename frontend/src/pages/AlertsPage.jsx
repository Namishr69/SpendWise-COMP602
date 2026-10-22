import { useContext, useState } from 'react'

import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import { BudgetContext } from '../context/BudgetProvider.jsx'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { useAlerts } from '../hooks/useAlerts.js'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { useTranslations } from '../hooks/useTranslations.js'
import { resolveCancellation } from '../utils/cancellationLinks.js'
import { formatCurrency } from '../utils/formatCurrency.js'

import './AlertsPage.css'

const ALERTS_TEXT = [
  'Loading alerts...',
  'Could not load alerts:',
  "You're all caught up!",
  "We'll let you know here when something needs your attention.",

  // Urgency groups, most urgent first.
  'Urgent',
  'Payments that may have failed and going over budget.',
  'Ending soon',
  'Free trials about to end.',
  'Reminders',
  'Upcoming payments and budget notes.',

  // Buttons inside alerts.
  'Dismiss',
  'Cancel Trial',
  'Open cancel page ↗',
  'Find how to cancel ↗',
  'Confirm',
  'Reject',
  'Could not update this subscription:',
  'Confirm all',
  'Review',
  'Hide',
]

function AlertsPage() {
  const { budget } =
    useContext(BudgetContext)

  const {
    subscriptions,
    pendingSubscriptions,
    getSubscription,
    updateSubscription,
    loading,
    error,
  } = useSubscriptions()

  const {
    preferredCurrency,
    rate,
  } = useCurrencyRate()

  const [
    loadingAlertsText,
    loadErrorText,
    caughtUpText,
    caughtUpHintText,
    urgentText,
    urgentHintText,
    endingSoonText,
    endingSoonHintText,
    remindersText,
    remindersHintText,
    dismissText,
    cancelTrialText,
    openCancelPageText,
    findHowToCancelText,
    confirmText,
    rejectText,
    actionErrorText,
    confirmAllText,
    reviewText,
    hideText,
  ] = useTranslations(ALERTS_TEXT)

  const { alerts, dismissAlert } = useAlerts(
    subscriptions,
    budget,
    preferredCurrency,
    rate,
    pendingSubscriptions,
  )

  // Which alert's button is saving, and why the last one failed.
  const [busyId, setBusyId] =
    useState(null)

  const [actionError, setActionError] =
    useState(null)

  // Whether the grouped "N new subscriptions found" alert is expanded.
  const [reviewOpen, setReviewOpen] =
    useState(false)

  const showMoney = (amount) =>
    formatCurrency(
      (Number(amount) || 0) * rate,
      preferredCurrency,
    )

  async function runAction(key, action) {
    setBusyId(key)
    setActionError(null)

    try {
      await action()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  function updateFromAlert(alert, changes) {
    return runAction(alert.id, () =>
      updateSubscription(
        alert.subscriptionId,
        changes,
      ),
    )
  }

  // Confirms every find in the grouped alert, one after another.
  function confirmAll(alert) {
    return runAction(alert.id, async () => {
      for (const subscription of alert.subscriptions) {
        await updateSubscription(
          subscription.id,
          { reviewStatus: 'confirmed' },
        )
      }
    })
  }

  // One find inside the expanded grouped alert.
  function reviewOne(subscription, reviewStatus) {
    return runAction(
      `review-${subscription.id}`,
      () =>
        updateSubscription(
          subscription.id,
          { reviewStatus },
        ),
    )
  }

  // Buttons for each kind of alert, so it can be handled right here.
  function renderActions(alert) {
    const busy = busyId === alert.id

    if (alert.kind === 'newSubscriptions') {
      return (
        <>
          <Button
            onClick={() =>
              confirmAll(alert)
            }
            disabled={busyId !== null}
          >
            {confirmAllText}
          </Button>

          <Button
            variant="secondary"
            aria-expanded={reviewOpen}
            onClick={() =>
              setReviewOpen(
                (open) => !open,
              )
            }
          >
            {reviewOpen
              ? hideText
              : reviewText}
          </Button>
        </>
      )
    }

    if (alert.kind === 'newSubscription') {
      return (
        <>
          <Button
            onClick={() =>
              updateFromAlert(alert, {
                reviewStatus: 'confirmed',
              })
            }
            disabled={busy}
          >
            {confirmText}
          </Button>

          <Button
            variant="secondary"
            onClick={() =>
              updateFromAlert(alert, {
                reviewStatus: 'rejected',
              })
            }
            disabled={busy}
          >
            {rejectText}
          </Button>
        </>
      )
    }

    const dismissButton = (
      <Button
        variant="secondary"
        onClick={() =>
          dismissAlert(alert.id)
        }
        disabled={busy}
      >
        {dismissText}
      </Button>
    )

    if (alert.kind === 'trialEnding') {
      // Cancel Trial marks it cancelled in SpendWise; the link is where the
      // user actually cancels with the provider.
      const cancellation = resolveCancellation(
        getSubscription(alert.subscriptionId)
          ?.name,
      )

      return (
        <>
          <Button
            onClick={() =>
              updateFromAlert(alert, {
                status: 'Cancelled',
              })
            }
            disabled={busy}
          >
            {cancelTrialText}
          </Button>

          {cancellation && (
            <a
              className="alerts-list__link"
              href={cancellation.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {cancellation.kind === 'official'
                ? openCancelPageText
                : findHowToCancelText}
            </a>
          )}

          {dismissButton}
        </>
      )
    }

    return dismissButton
  }

  // Traffic-light groups: red for failed payments and going over budget, orange for free trials
  // ending soon, blue for standard reminders. Empty groups are not shown.
  const groups = [
    {
      level: 'red',
      title: urgentText,
      hint: urgentHintText,
    },
    {
      level: 'orange',
      title: endingSoonText,
      hint: endingSoonHintText,
    },
    {
      level: 'blue',
      title: remindersText,
      hint: remindersHintText,
    },
  ]
    .map((group) => ({
      ...group,
      alerts: alerts.filter(
        (alert) =>
          alert.level === group.level,
      ),
    }))
    .filter(
      (group) => group.alerts.length > 0,
    )

  if (loading) {
    return (
      <AppShell activeNav="Alerts">
        <p>{loadingAlertsText}</p>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell activeNav="Alerts">
        <p>
          {loadErrorText} {error.message}
        </p>
      </AppShell>
    )
  }

  return (
    <AppShell activeNav="Alerts">
      <Card>
        {actionError && (
          <p
            className="alerts-error"
            role="alert"
          >
            {actionErrorText}{' '}
            {actionError}
          </p>
        )}

        {alerts.length === 0 ? (
          <div className="alerts-empty">
            <svg
              className="alerts-empty__icon"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="24"
                cy="24"
                r="18"
                stroke="currentColor"
                strokeWidth="2"
              />

              <path
                d="m16 24.5 5.5 5.5L32 19"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <p className="alerts-empty__title">
              {caughtUpText}
            </p>

            <p className="alerts-empty__hint">
              {caughtUpHintText}
            </p>
          </div>
        ) : (
          <div className="alerts-groups">
            {groups.map((group) => (
              <section
                key={group.level}
                className={`alerts-group alerts-group--${group.level}`}
                aria-labelledby={`alerts-group-${group.level}`}
              >
                <h4
                  id={`alerts-group-${group.level}`}
                  className="alerts-group__title"
                >
                  <span
                    className="alerts-group__dot"
                    aria-hidden="true"
                  />

                  {group.title}

                  <span className="alerts-group__count">
                    {group.alerts.length}
                  </span>
                </h4>

                <p className="alerts-group__hint">
                  {group.hint}
                </p>

                <ul className="alerts-list">
                  {group.alerts.map(
                    (alert) => (
                      <li
                        key={alert.id}
                        className="alerts-list__item"
                      >
                        <span className="alerts-list__message">
                          {alert.message}
                        </span>

                        <div className="alerts-list__actions">
                          {renderActions(
                            alert,
                          )}
                        </div>

                        {alert.kind ===
                          'newSubscriptions' &&
                          reviewOpen && (
                            <ul className="alerts-review">
                              {alert.subscriptions.map(
                                (subscription) => (
                                  <li
                                    key={
                                      subscription.id
                                    }
                                    className="alerts-review__item"
                                  >
                                    <span>
                                      <strong>
                                        {
                                          subscription.name
                                        }
                                      </strong>
                                      {', '}
                                      {showMoney(
                                        subscription.amount,
                                      )}{' '}
                                      /{' '}
                                      {
                                        subscription.billingCycle
                                      }
                                    </span>

                                    <div className="alerts-list__actions">
                                      <Button
                                        onClick={() =>
                                          reviewOne(
                                            subscription,
                                            'confirmed',
                                          )
                                        }
                                        disabled={
                                          busyId !==
                                          null
                                        }
                                      >
                                        {
                                          confirmText
                                        }
                                      </Button>

                                      <Button
                                        variant="secondary"
                                        onClick={() =>
                                          reviewOne(
                                            subscription,
                                            'rejected',
                                          )
                                        }
                                        disabled={
                                          busyId !==
                                          null
                                        }
                                      >
                                        {
                                          rejectText
                                        }
                                      </Button>
                                    </div>
                                  </li>
                                ),
                              )}
                            </ul>
                          )}
                      </li>
                    ),
                  )}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  )
}

export default AlertsPage
