import { useContext } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { CurrencyContext } from '../context/CurrencyProvider.jsx'
import { BudgetContext } from '../context/BudgetProvider.jsx'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { calculateTotalMonthlySpend, isNearBudgetLimit, normalizeBudgetToMonthly } from '../utils/budgetCalculations.js'
import './DashboardPage.css'

const CATEGORIES = ['Entertainment', 'Fitness', 'Cloud Storage']

function DashboardPage() {
  const { preferredCurrency } = useContext(CurrencyContext)
  const { budget } = useContext(BudgetContext)
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

  const totalMonthlySpend = calculateTotalMonthlySpend(subscriptions)
  const nearBudgetLimit = isNearBudgetLimit(totalMonthlySpend, budget)

  const now = new Date()
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const dueThisWeekTotal = activeSubscriptions
    .filter((s) => {
      if (!s.nextPaymentDate) return false
      const due = new Date(s.nextPaymentDate)
      return due >= now && due <= weekFromNow
    })
    .reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

  const alerts = []
  if (nearBudgetLimit) {
    const monthlyBudget = normalizeBudgetToMonthly(budget.amount, budget.period)
    alerts.push(
      `You've spent ${formatCurrency(totalMonthlySpend, preferredCurrency)} of your ${formatCurrency(monthlyBudget, preferredCurrency)} monthly budget`,
    )
  }
  const cancelledCount = subscriptions.length - activeSubscriptions.length
  if (cancelledCount > 0) {
    alerts.push(`${cancelledCount} cancelled subscription${cancelledCount > 1 ? 's' : ''}`)
  }

  const sorted = [...subscriptions].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  return (
    <AppShell activeNav="Dashboard">
      <div className="dashboard-stats">
        <Card tone="forest" className="dashboard-stat">
          <p>Spent this month</p>
          <h2 className="money">
            {formatCurrency(totalMonthlySpend, preferredCurrency)}
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
          <h2>{alerts.length}</h2>
        </Card>
      </div>

      <div className="dashboard-grid">
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

        <div className="dashboard-side">
          <Card>
            <h3>Current Budget</h3>
            {budget ? (
              <>
                <p className="dashboard-budget-amount">
                  {formatCurrency(budget.amount, preferredCurrency)} / {budget.period}
                </p>
                <p className="dashboard-budget-equivalent">
                  ≈ {formatCurrency(normalizeBudgetToMonthly(budget.amount, budget.period), preferredCurrency)} per month
                </p>

                <div className="dashboard-budget-bar">
                  <div
                    className={`dashboard-budget-bar__fill ${nearBudgetLimit ? 'dashboard-budget-bar__fill--warning' : ''}`}
                    style={{
                      width: `${Math.min(
                        100,
                        (totalMonthlySpend / normalizeBudgetToMonthly(budget.amount, budget.period)) * 100,
                      )}%`,
                    }}
                  />
                </div>

                <p className="dashboard-budget-spent">
                  {formatCurrency(totalMonthlySpend, preferredCurrency)} spent so far
                </p>
              </>
            ) : (
              <p>No budget set. Add one in Settings.</p>
            )}
          </Card>

          <Card>
            <h3>Alerts</h3>

            <div className="dashboard-chips">
              {alerts.length === 0 ? (
                <p>No alerts right now.</p>
              ) : (
                alerts.map((alert) => (
                  <span key={alert} className="dashboard-chip">
                    {alert}
                  </span>
                ))
              )}
            </div>
          </Card>

          <Card>
            <h3>By category</h3>

            <ul className="dashboard-categories">
              {CATEGORIES.map((category) => (
                <li key={category}>{category}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

export default DashboardPage
