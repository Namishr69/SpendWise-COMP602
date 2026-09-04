import { useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { CurrencyContext } from '../context/currencyContext.js'
import { convertCurrency } from '../api/exchangeRateApi.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { getDashboard } from '../api/bankDataApi.js'
import './DashboardPage.css'

// Shown before data loads and whenever the user is signed out or not yet
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

  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Display model, after converting the backend's NZD figures to the user's
  // preferred currency.
  const [stats, setStats] = useState([])
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
          setError(null)
          setLoading(false)
        }
        return
      }

      try {
        const data = await getDashboard()
        if (!cancelled) {
          setDashboard(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // Convert money to the preferred currency. Counts pass through untouched, and
  // convertCurrency short-circuits when currencies match, so the default NZD
  // case makes no network calls.
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

        setStats([
          { label: 'Spent this month', amount: spent, currency: preferredCurrency },
          { label: 'Active subs', value: String(s.activeSubs) },
          { label: 'Due this week', amount: due, currency: preferredCurrency },
          { label: 'Detected subs', value: String(s.detectedSubs) },
        ])
        setBills(convertedBills)
        setTransactions(convertedTxns)
      } catch (err) {
        console.error('Currency conversion failed:', err)
        // Fall back to the source-currency figures so the page still renders.
        if (cancelled) return
        setStats([
          { label: 'Spent this month', amount: s.spentThisMonth, currency: source },
          { label: 'Active subs', value: String(s.activeSubs) },
          { label: 'Due this week', amount: s.dueThisWeek, currency: source },
          { label: 'Detected subs', value: String(s.detectedSubs) },
        ])
        setBills(upcomingBills)
        setTransactions(recentTransactions)
      }
    }

    convert()

    return () => {
      cancelled = true
    }
  }, [dashboard, preferredCurrency])

  return (
    <AppShell activeNav="Dashboard">
      {error && (
        <Card className="dashboard-notice">
          <p>Could not load your dashboard: {error.message}</p>
        </Card>
      )}

      {!loading && !error && !dashboard.hasData && (
        <Card className="dashboard-notice">
          <h3>No bank data yet</h3>
          <p>
            Connect your bank in <strong>Settings</strong> to see spending,
            upcoming bills and automatically detected subscriptions.
          </p>
        </Card>
      )}

      <div className="dashboard-stats">
        {stats.map((stat) => (
          <Card key={stat.label} tone="forest" className="dashboard-stat">
            <p>{stat.label}</p>

            <h2 className="money">
              {stat.amount !== undefined
                ? formatCurrency(stat.amount, stat.currency)
                : stat.value}
            </h2>
          </Card>
        ))}
      </div>

      <div className="dashboard-grid">
        <Card>
          <h3>Upcoming bills</h3>

          {bills.length === 0 ? (
            <p className="dashboard-empty">No upcoming bills.</p>
          ) : (
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
          )}
        </Card>

        <div className="dashboard-side">
          <Card>
            <h3>Recent activity</h3>

            {transactions.length === 0 ? (
              <p className="dashboard-empty">No transactions yet.</p>
            ) : (
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
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

export default DashboardPage
