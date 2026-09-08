import { useContext } from 'react'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { CurrencyContext } from '../context/CurrencyProvider.jsx'
import { BudgetContext } from '../context/BudgetProvider.jsx'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { useAlerts } from '../hooks/useAlerts.js'
import './AlertsPage.css'

function AlertsPage() {
  const { preferredCurrency } = useContext(CurrencyContext)
  const { budget } = useContext(BudgetContext)
  const { subscriptions, loading, error } = useSubscriptions()

  if (loading) {
    return (
      <AppShell activeNav="Alerts">
        <p>Loading alerts…</p>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell activeNav="Alerts">
        <p>Could not load alerts: {error.message}</p>
      </AppShell>
    )
  }

  const { alerts } = useAlerts(subscriptions, budget, preferredCurrency)

  return (
    <AppShell activeNav="Alerts">
      <Card>
        <h3>Alerts</h3>

        {alerts.length === 0 ? (
          <p>No alerts right now.</p>
        ) : (
          <ul className="alerts-list">
            {alerts.map((alert) => (
              <li key={alert} className="alerts-list__item">
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