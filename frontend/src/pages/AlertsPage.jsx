import { useContext } from 'react'

import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { BudgetContext } from '../context/BudgetProvider.jsx'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { useAlerts } from '../hooks/useAlerts.js'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { useTranslations } from '../hooks/useTranslations.js'

import './AlertsPage.css'

const ALERTS_TEXT = [
  'Loading alerts...',
  'Could not load alerts:',
  'Alerts',
  'No alerts right now.',

  // Urgency groups, most urgent first.
  'Urgent',
  'Payments that may have failed.',
  'Ending soon',
  'Free trials about to end.',
  'Reminders',
  'Upcoming payments and budget notes.',
]

function AlertsPage() {
  const { budget } =
    useContext(BudgetContext)

  const {
    subscriptions,
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
    alertsText,
    noAlertsText,
    urgentText,
    urgentHintText,
    endingSoonText,
    endingSoonHintText,
    remindersText,
    remindersHintText,
  ] = useTranslations(ALERTS_TEXT)

  const { alerts } = useAlerts(
    subscriptions,
    budget,
    preferredCurrency,
    rate,
  )

  // Traffic-light groups: red for failed payments, orange for free trials
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
        <h3>{alertsText}</h3>

        {alerts.length === 0 ? (
          <p>{noAlertsText}</p>
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
                        {alert.message}
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
