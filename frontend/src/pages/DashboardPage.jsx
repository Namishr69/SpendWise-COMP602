import { useContext } from 'react'
import { useContext, useEffect, useState } from 'react'
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
import { AuthContext } from '../context/AuthProvider.jsx'
import { convertCurrency } from '../api/exchangeRateApi.js'
import { getTransactions } from '../api/transactionApi.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import './DashboardPage.css'

// Mock data — replace with real Firestore data once backend endpoints exist
const STATS = [
  {
    label: 'Spent this month',
    amount: 342.80,
    currency: 'NZD',
  },
  {
    label: 'Active subs',
    value: '9',
  },
  {
    label: 'Due this week',
    amount: 74.98,
    currency: 'NZD',
  },
  {
    label: 'Alerts',
    value: '3',
  },
]

const UPCOMING_BILLS = [
  {
    name: 'Netflix',
    due: 'Due Aug',
    amount: 25.99,
    currency: 'NZD',
  },
  {
    name: 'Spotify',
    due: 'Due Aug',
    amount: 16.99,
    currency: 'NZD',
  },
  {
    name: 'iCloud',
    due: 'Due Aug',
    amount: 4.99,
    currency: 'NZD',
  },
  {
    name: 'Gym membership',
    due: 'Due Aug',
    amount: 49.00,
    currency: 'NZD',
  },
]

const ALERTS = [
  '2 trials ending soon',
  '1 unused subscription',
]

const CATEGORIES = [
  'Entertainment',
  'Fitness',
  'Cloud Storage',
]

function DashboardPage() {
  const { preferredCurrency } =
    useContext(CurrencyContext)

  const { currentUser } =
    useContext(AuthContext)

  const [convertedStats, setConvertedStats] =
    useState(STATS)

  const [convertedBills, setConvertedBills] =
    useState(UPCOMING_BILLS)

  const [transactions, setTransactions] =
    useState([])

  const [
    displayTransactions,
    setDisplayTransactions,
  ] = useState([])

  /*
   * Convert the dashboard mock statistics
   * and upcoming bills whenever the user's
   * preferred currency changes.
   */
  useEffect(() => {
    async function updateCurrencies() {
      try {
        const newStats = await Promise.all(
          STATS.map(async (stat) => {
            if (stat.amount === undefined) {
              return stat
            }

            const convertedAmount =
              await convertCurrency(
                stat.amount,
                stat.currency,
                preferredCurrency
              )

            return {
              ...stat,
              amount: convertedAmount,
              currency: preferredCurrency,
            }
          })
        )

        const newBills = await Promise.all(
          UPCOMING_BILLS.map(async (bill) => {
            const convertedAmount =
              await convertCurrency(
                bill.amount,
                bill.currency,
                preferredCurrency
              )

            return {
              ...bill,
              amount: convertedAmount,
              currency: preferredCurrency,
            }
          })
        )

        setConvertedStats(newStats)
        setConvertedBills(newBills)
      } catch (error) {
        console.error(
          'Currency conversion failed:',
          error
        )
      }
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

  /*
   * Load the signed-in user's transactions.
   */
  useEffect(() => {
    async function loadTransactions() {
      try {
        const data =
          await getTransactions(currentUser)

        setTransactions(data)
      } catch (error) {
        console.error(
          'Could not load transactions:',
          error
        )
      }
    }

    if (currentUser) {
      loadTransactions()
    }
  }, [currentUser])

  /*
   * Convert each transaction from the
   * currency it was originally saved in
   * into the user's current preferred currency.
   */
  useEffect(() => {
    async function convertTransactions() {
      try {
        const converted =
          await Promise.all(
            transactions.map(
              async (transaction) => {
                /*
                 * Older transactions may not have
                 * a currency field because they
                 * were created before we added it.
                 *
                 * Those are treated as NZD.
                 */
                const originalCurrency =
                  transaction.currency || 'NZD'

                const convertedAmount =
                  await convertCurrency(
                    transaction.amount,
                    originalCurrency,
                    preferredCurrency
                  )

                return {
                  ...transaction,
                  displayAmount: convertedAmount,
                }
              }
            )
          )

        setDisplayTransactions(converted)
      } catch (error) {
        console.error(
          'Transaction currency conversion failed:',
          error
        )

        /*
         * If the conversion service fails,
         * still display the transactions.
         */
        setDisplayTransactions(
          transactions.map(
            (transaction) => ({
              ...transaction,
              displayAmount:
                transaction.amount,
            })
          )
        )
      }
    }

    if (transactions.length > 0) {
      convertTransactions()
    } else {
      setDisplayTransactions([])
    }
  }, [
    transactions,
    preferredCurrency,
  ])

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
        {convertedStats.map((stat) => (
          <Card
            key={stat.label}
            tone="forest"
            className="dashboard-stat"
          >
            <p>{stat.label}</p>

            <h2 className="money">
              {stat.amount !== undefined
                ? formatCurrency(
                    stat.amount,
                    stat.currency
                  )
                : stat.value}
            </h2>
          </Card>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <Card>
            <h3>Upcoming bills</h3>

            <ul className="dashboard-list">
              {convertedBills.map((bill) => (
                <li
                  key={bill.name}
                  className="dashboard-list__item"
                >
                  <div>
                    <p className="dashboard-list__name">
                      {bill.name}
                    </p>

                    <p className="dashboard-list__due">
                      {bill.due}
                    </p>
                  </div>

                  <span className="money">
                    {formatCurrency(
                      bill.amount,
                      bill.currency
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="dashboard-transactions-header">
              <div>
                <h3>Recent transactions</h3>

                <p>
                  Manually added spending.
                </p>
              </div>

              <div className="dashboard-transactions-actions">
                <Link to="/transactions">
                  View all
                </Link>

                <Link
                  className="dashboard-add-transaction"
                  to="/transactions/new"
                >
                  + Add transaction
                </Link>
              </div>
            </div>

            {displayTransactions.length === 0 ? (
              <p className="dashboard-empty">
                No transactions yet.
              </p>
            ) : (
              <ul className="dashboard-list">
                {displayTransactions
                  .slice(0, 5)
                  .map((transaction) => (
                    <li
                      key={transaction.id}
                      className="dashboard-list__item"
                    >
                      <div>
                        <p className="dashboard-list__name">
                          {transaction.name}
                        </p>

                        <p className="dashboard-list__due">
                          {transaction.category}
                          {' · '}
                          {transaction.date}
                        </p>
                      </div>

                      <span className="money">
                        {formatCurrency(
                          transaction.displayAmount,
                          preferredCurrency
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="dashboard-side">
          <Card>
            <h3>Alerts</h3>

            <div className="dashboard-chips">
              {ALERTS.map((alert) => (
                <span
                  key={alert}
                  className="dashboard-chip"
                >
                  {alert}
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <h3>By category</h3>

            <ul className="dashboard-categories">
              {CATEGORIES.map(
                (category) => (
                  <li key={category}>
                    {category}
                  </li>
                )
              )}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

export default DashboardPage
