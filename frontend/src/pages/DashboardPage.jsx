import { useContext } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { CurrencyContext } from '../context/CurrencyProvider.jsx'
import { useSubscriptions } from '../context/subscriptionsContext'
import { formatCurrency } from '../utils/formatCurrency.js'
import './DashboardPage.css'

function DashboardPage() {
  const { preferredCurrency } = useContext(CurrencyContext)
  const { subscriptions, loading, error } = useSubscriptions()

  if (loading) {
    return (
      <AppShell activeNav="Dashboard">
        <p>Loading dashboard…</p>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell activeNav="Dashboard">
        <p>Could not load dashboard: {error.message}</p>
      </AppShell>
    )
  }

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status?.toLowerCase() !== 'cancelled',
  )

  const totalMonthly = activeSubscriptions.reduce((sum, s) => {
    const amount = Number(s.amount) || 0
    switch (s.billingCycle?.toLowerCase()) {
      case 'weekly':
        return sum + amount * 4.33
      case 'quarterly':
        return sum + amount / 3
      case 'yearly':
        return sum + amount / 12
      default:
        return sum + amount
    }
  }, 0)

  const sorted = [...subscriptions].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  return (
    <AppShell activeNav="Dashboard">
      <div className="dashboard-stats">
        <Card tone="forest" className="dashboard-stat">
          <p>Monthly spend</p>
          <h2 className="money">
            {formatCurrency(totalMonthly, preferredCurrency)}
          </h2>
        </Card>

        <Card tone="forest" className="dashboard-stat">
          <p>Active subs</p>
          <h2>{activeSubscriptions.length}</h2>
        </Card>

        <Card tone="forest" className="dashboard-stat">
          <p>Cancelled</p>
          <h2>{subscriptions.length - activeSubscriptions.length}</h2>
        </Card>

        <Card tone="forest" className="dashboard-stat">
          <p>Total subs</p>
          <h2>{subscriptions.length}</h2>
        </Card>
      </div>

      <Card>
        <h3>My Subscriptions</h3>

        <ul className="dashboard-subs">
          {sorted.map((subscription) => (
            <li key={subscription.id} className="dashboard-subs__item">
              <Link
                to={`/subscriptions/${subscription.id}`}
                className="dashboard-subs__link"
              >
                <div>
                  <p className="dashboard-subs__name">{subscription.name}</p>
                  <p className="dashboard-subs__meta">
                    {formatCurrency(subscription.amount, preferredCurrency)} /{' '}
                    {subscription.billingCycle?.toLowerCase()}
                  </p>
                </div>

                <span
                  className={`dashboard-subs__status dashboard-subs__status--${subscription.status?.toLowerCase() === 'cancelled' ? 'cancelled' : 'active'}`}
                >
                  {subscription.status || 'Active'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  )
}

export default DashboardPage
