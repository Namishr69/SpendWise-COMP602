import { useContext, useEffect, useState } from 'react'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { CurrencyContext } from '../context/CurrencyProvider.jsx'
import { BudgetContext } from '../context/BudgetProvider.jsx'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { convertCurrency } from '../api/exchangeRateApi.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { calculateTotalMonthlySpend, isNearBudgetLimit, normalizeBudgetToMonthly } from '../utils/budgetCalculations.js'
import './DashboardPage.css'

// Mock data — replace with real Firestore data once the backend endpoints exist
const STATS = [
  { label: 'Spent this month', amount: 342.80, currency: 'NZD' },
  { label: 'Active subs', value: '9' },
  { label: 'Due this week', amount: 74.98, currency: 'NZD' },
  { label: 'Alerts', value: '3' },
]

const UPCOMING_BILLS = [
  { name: 'Netflix', due: 'Due Aug', amount: 25.99, currency: 'NZD' },
  { name: 'Spotify', due: 'Due Aug', amount: 16.99, currency: 'NZD' },
  { name: 'iCloud', due: 'Due Aug', amount: 4.99, currency: 'NZD' },
  { name: 'Gym membership', due: 'Due Aug', amount: 49.00, currency: 'NZD' },
]

const ALERTS = ['2 trials ending soon', '1 unused subscription']

const CATEGORIES = ['Entertainment', 'Fitness', 'Cloud Storage']

function DashboardPage() {
  const { preferredCurrency } = useContext(CurrencyContext)
  const { budget } = useContext(BudgetContext)
  const { subscriptions, loading: subscriptionsLoading } = useSubscriptions()

  const [convertedStats, setConvertedStats] = useState(STATS)
  const [convertedBills, setConvertedBills] = useState(UPCOMING_BILLS)

  const totalMonthlySpend = calculateTotalMonthlySpend(subscriptions)
  const nearBudgetLimit = !subscriptionsLoading && isNearBudgetLimit(totalMonthlySpend, budget)

  const alerts = [...ALERTS]
  if (nearBudgetLimit) {
    const monthlyBudget = normalizeBudgetToMonthly(budget.amount, budget.period)
    alerts.unshift(
      `You've spent ${formatCurrency(totalMonthlySpend, preferredCurrency)} of your ${formatCurrency(monthlyBudget, preferredCurrency)} monthly budget`
    )
  }

  useEffect(() => {
    async function updateCurrencies() {
      try {
        const newStats = await Promise.all(
          STATS.map(async (stat) => {
            if (stat.amount === undefined) {
              return stat
            }

            const convertedAmount = await convertCurrency(
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
            const convertedAmount = await convertCurrency(
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
        console.error('Currency conversion failed:', error)
      }
    }

    updateCurrencies()
  }, [preferredCurrency])

  return (
    <AppShell activeNav="Dashboard">
      <div className="dashboard-stats">
        {convertedStats.map((stat) => (
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

          <ul className="dashboard-list">
            {convertedBills.map((bill) => (
              <li key={bill.name} className="dashboard-list__item">
                <div>
                  <p className="dashboard-list__name">{bill.name}</p>
                  <p className="dashboard-list__due">{bill.due}</p>
                </div>

                <span className="money">
                  {formatCurrency(bill.amount, bill.currency)}
                </span>
              </li>
            ))}
          </ul>
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
                  {alert}
                </span>
              ))}
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