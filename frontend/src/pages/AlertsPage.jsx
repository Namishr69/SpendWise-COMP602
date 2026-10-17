import { useContext } from 'react'

import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { CurrencyContext } from '../context/currencyContext.js'
import { BudgetContext } from '../context/BudgetProvider.jsx'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { useAlerts } from '../hooks/useAlerts.js'
import { useTranslations } from '../hooks/useTranslations.js'

import './AlertsPage.css'

const ALERTS_TEXT = [
  'Loading alerts...',
  'Could not load alerts:',
  'Alerts',
  'No alerts right now.',
]

function AlertsPage() {
  const { preferredCurrency } =
    useContext(CurrencyContext)

  const { budget } =
    useContext(BudgetContext)

  const {
    subscriptions,
    loading,
    error,
  } = useSubscriptions()

  const [
    loadingAlertsText,
    loadErrorText,
    alertsText,
    noAlertsText,
  ] = useTranslations(ALERTS_TEXT)

  const { alerts } = useAlerts(
    subscriptions,
    budget,
    preferredCurrency,
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
          <ul className="alerts-list">
            {alerts.map((alert) => (
              <li
                key={alert}
                className="alerts-list__item"
              >
                {alert}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  )
}

export default AlertsPage