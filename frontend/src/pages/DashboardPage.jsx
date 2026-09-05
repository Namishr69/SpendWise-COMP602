import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { CurrencyContext } from '../context/CurrencyProvider.jsx'
import { BudgetContext } from '../context/BudgetProvider.jsx'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { AuthContext } from '../context/AuthProvider.jsx'
import { convertCurrency } from '../api/exchangeRateApi.js'
import { getTransactions } from '../api/transactionApi.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { calculateTotalMonthlySpend, isNearBudgetLimit, normalizeBudgetToMonthly } from '../utils/budgetCalculations.js'
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
  const { preferredCurrency } = useContext(CurrencyContext)
  const { budget } = useContext(BudgetContext)
  const { subscriptions, loading: subscriptionsLoading } = useSubscriptions()
  const { preferredCurrency } =
    useContext(CurrencyContext)

  const { currentUser } =
    useContext(AuthContext)

  const [convertedStats, setConvertedStats] =
    useState(STATS)

  const [convertedBills, setConvertedBills] =
    useState(UPCOMING_BILLS)

  const totalMonthlySpend = calculateTotalMonthlySpend(subscriptions)
  const nearBudgetLimit = !subscriptionsLoading && isNearBudgetLimit(totalMonthlySpend, budget)

  const alerts = [...ALERTS]
  if (nearBudgetLimit) {
    const monthlyBudget = normalizeBudgetToMonthly(budget.amount, budget.period)
    alerts.unshift(
      `You've spent ${formatCurrency(totalMonthlySpend, preferredCurrency)} of your ${formatCurrency(monthlyBudget, preferredCurrency)} monthly budget`
    )
  }

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

    updateCurrencies()
  }, [preferredCurrency])

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
              {alerts.map((alert) => (
                <span key={alert} className="dashboard-chip">
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