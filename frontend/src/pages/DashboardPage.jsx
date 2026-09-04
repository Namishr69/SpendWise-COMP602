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

  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const dueThisWeek = activeSubscriptions.filter((s) => {
    if (!s.nextPaymentDate) return false
    const due = new Date(s.nextPaymentDate)
    return due >= now && due <= weekFromNow
  })
  const dueThisWeekTotal = dueThisWeek.reduce(
    (sum, s) => sum + (Number(s.amount) || 0),
    0,
  )

  const cancelledCount = subscriptions.length - activeSubscriptions.length

  const sorted = [...subscriptions].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  return (
    <AppShell activeNav="Dashboard">
      <div className="dashboard-stats">
        <Card tone="forest" className="dashboard-stat">
          <p>Spent this month</p>
          <h2 className="money">
            {formatCurrency(totalMonthly, preferredCurrency)}
          </h2>
        </Card>

        <Card tone="forest" className="dashboard-stat">
          <p>Active subs</p>
          <h2>{activeSubscriptions.length}</h2>
        </Card>

        <Card tone="forest" className="dashboard-stat">
          <p>Due this week</p>
          <h2 className="money">
            {formatCurrency(dueThisWeekTotal, preferredCurrency)}
          </h2>
        </Card>

        <Card tone="forest" className="dashboard-stat">
          <p>Alerts</p>
          <h2>{cancelledCount}</h2>
        </Card>
      </div>

      <Card>
        <h3>My Subscriptions</h3>

        {sorted.length === 0 ? (
          <div className="dashboard-empty">
            <svg
              className="dashboard-empty__icon"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="8" y="14" width="32" height="22" rx="3" stroke="currentColor" strokeWidth="2" />
              <path d="M8 22h32" stroke="currentColor" strokeWidth="2" />
              <line x1="14" y1="28" x2="22" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="14" y1="32" x2="18" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="36" cy="34" r="8" fill="var(--color-white)" stroke="currentColor" strokeWidth="2" />
              <line x1="36" y1="30" x2="36" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="32" y1="34" x2="40" y2="34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="dashboard-empty__title">No subscriptions yet</p>
            <p className="dashboard-empty__hint">
              Add your first subscription to start tracking your spending.
            </p>
            <Link to="/subscriptions/new" className="dashboard-empty__cta">
              + Add subscription
            </Link>
          </div>
        ) : (
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
        )}
      </Card>
    </AppShell>
  )
}

export default DashboardPage
