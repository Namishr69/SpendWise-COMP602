import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { CurrencyContext } from '../context/currencyContext.js'
import { BudgetContext } from '../context/BudgetProvider.jsx'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { convertCurrency } from '../api/exchangeRateApi.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import {
  calculateTotalMonthlySpend,
  isNearBudgetLimit,
  normalizeBudgetToMonthly,
} from '../utils/budgetCalculations.js'
import { getDashboard } from '../api/bankDataApi.js'
import './DashboardPage.css'

// Shown before bank data loads and whenever the user is signed out or not yet
// connected, so the page always renders sane zeros instead of crashing.
const EMPTY_DASHBOARD = {
  currency: 'NZD',
  hasData: false,
  stats: { spentThisMonth: 0, activeSubs: 0, dueThisWeek: 0, detectedSubs: 0 },
  upcomingBills: [],
  recentTransactions: [],
}

function formatDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

function DashboardPage() {
  const { preferredCurrency } = useContext(CurrencyContext)
  const { budget } = useContext(BudgetContext)
  const {
    subscriptions,
    loading: subsLoading,
    error: subsError,
  } = useSubscriptions()

  // Bank-synced figures from ANZ, kept separate from the manually tracked
  // subscriptions above so one failing never blanks the other.
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [bankLoading, setBankLoading] = useState(true)
  const [bankError, setBankError] = useState(null)

  // Bank figures converted into the user's preferred currency.
  const [bankStats, setBankStats] = useState(null)
  const [bills, setBills] = useState([])
  const [transactions, setTransactions] = useState([])

  // Fetch once we know who is signed in — mirrors SubscriptionsProvider so the
  // Firebase ID token is available when the request goes out.
  useEffect(() => {
    let cancelled = false

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) {
          setDashboard(EMPTY_DASHBOARD)
          setBankError(null)
          setBankLoading(false)
        }
        return
      }

      try {
        const data = await getDashboard()
        if (!cancelled) {
          setDashboard(data)
          setBankError(null)
        }
      } catch (err) {
        if (!cancelled) setBankError(err)
      } finally {
        if (!cancelled) setBankLoading(false)
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // Convert money to the preferred currency. convertCurrency short-circuits
  // when currencies match, so the default NZD case makes no network calls.
  useEffect(() => {
    let cancelled = false

    async function convert() {
      const source = dashboard.currency || 'NZD'
      const { stats: s, upcomingBills, recentTransactions } = dashboard
      const toPreferred = (amount, from) =>
        convertCurrency(amount, from || source, preferredCurrency)

      try {
        const [spent, due] = await Promise.all([
          toPreferred(s.spentThisMonth),
          toPreferred(s.dueThisWeek),
        ])

        const convertedBills = await Promise.all(
          upcomingBills.map(async (b) => ({
            ...b,
            amount: await toPreferred(b.amount, b.currency),
            currency: preferredCurrency,
          }))
        )

        const convertedTxns = await Promise.all(
          recentTransactions.map(async (t) => ({
            ...t,
            amount: await toPreferred(t.amount, t.currency),
            currency: preferredCurrency,
          }))
        )

        if (cancelled) return

        setBankStats({
          spentThisMonth: spent,
          dueThisWeek: due,
          detectedSubs: s.detectedSubs,
          currency: preferredCurrency,
        })
        setBills(convertedBills)
        setTransactions(convertedTxns)
      } catch (err) {
        console.error('Currency conversion failed:', err)
        // Fall back to the source-currency figures so the page still renders.
        if (cancelled) return
        setBankStats({
          spentThisMonth: s.spentThisMonth,
          dueThisWeek: s.dueThisWeek,
          detectedSubs: s.detectedSubs,
          currency: source,
        })
        setBills(upcomingBills)
        setTransactions(recentTransactions)
      }
    }

    convert()

    return () => {
      cancelled = true
    }
  }, [dashboard, preferredCurrency])

  if (subsLoading) {
    return (
      <AppShell activeNav="Dashboard">
        <p>Loading dashboard…</p>
      </AppShell>
    )
  }

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status?.toLowerCase() !== 'cancelled'
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
      `You've spent ${formatCurrency(totalMonthlySpend, preferredCurrency)} of your ${formatCurrency(monthlyBudget, preferredCurrency)} monthly budget`
    )
  }
  const cancelledCount = subscriptions.length - activeSubscriptions.length
  if (cancelledCount > 0) {
    alerts.push(
      `${cancelledCount} cancelled subscription${cancelledCount > 1 ? 's' : ''}`
    )
  }

  const sorted = [...subscriptions].sort((a, b) => a.name.localeCompare(b.name))

  // Prefer the bank's spend figure once a connection has synced; fall back to
  // the subscription total so the tile is never empty.
  const spentDisplay =
    dashboard.hasData && bankStats
      ? formatCurrency(bankStats.spentThisMonth, bankStats.currency)
      : formatCurrency(totalMonthlySpend, preferredCurrency)

  return (
    <AppShell activeNav="Dashboard">
      {subsError && (
        <Card className="dashboard-notice">
          <p>Could not load subscriptions: {subsError.message}</p>
        </Card>
      )}

      {bankError && (
        <Card className="dashboard-notice">
          <p>Could not load your bank data: {bankError.message}</p>
        </Card>
      )}

      {!bankLoading && !bankError && !dashboard.hasData && (
        <Card className="dashboard-notice">
          <h3>No bank data yet</h3>
          <p>
            Connect your bank in <strong>Settings</strong> to see spending,
            upcoming bills and automatically detected subscriptions.
          </p>
        </Card>
      )}

      <div className="dashboard-stats">
        <Card tone="forest" className="dashboard-stat">
          <p>Spent this month</p>
          <h2 className="money">{spentDisplay}</h2>
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
          <p>{dashboard.hasData ? 'Detected subs' : 'Alerts'}</p>
          <h2>
            {dashboard.hasData && bankStats
              ? bankStats.detectedSubs
              : alerts.length}
          </h2>
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
                        (totalMonthlySpend / normalizeBudgetToMonthly(budget.amount, budget.period)) * 100
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

          {bills.length > 0 && (
            <Card>
              <h3>Upcoming bills</h3>

              <ul className="dashboard-list">
                {bills.map((bill) => (
                  <li key={`${bill.name}-${bill.due}`} className="dashboard-list__item">
                    <div>
                      <p className="dashboard-list__name">{bill.name}</p>
                      <p className="dashboard-list__due">Due {formatDate(bill.due)}</p>
                    </div>

                    <span className="money">
                      {formatCurrency(bill.amount, bill.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {transactions.length > 0 && (
            <Card>
              <h3>Recent activity</h3>

              <ul className="dashboard-list">
                {transactions.map((txn) => (
                  <li
                    key={txn.transactionId || `${txn.merchant}-${txn.bookedAt}`}
                    className="dashboard-list__item"
                  >
                    <div>
                      <p className="dashboard-list__name">
                        {txn.merchant || txn.description}
                      </p>
                      <p className="dashboard-list__due">{formatDate(txn.bookedAt)}</p>
                    </div>

                    <span className="money">
                      {txn.direction === 'debit' ? '−' : '+'}
                      {formatCurrency(txn.amount, txn.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default DashboardPage
