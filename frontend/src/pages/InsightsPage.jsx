import { useContext, useEffect, useState } from 'react'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import {
  normalizeSubscriptionToMonthly,
  calculateTotalMonthlySpend,
} from '../utils/budgetCalculations.js'
import './InsightsPage.css'
import { getBankTransactions } from '../api/bankDataApi.js'
import { getTransactions } from '../api/transactionApi.js'
import { AuthContext } from '../context/authContext.js'
import { compareMonthToPrevious } from '../utils/monthlySpend.js'
import { getPayments } from '../api/subscriptionApi.js'

function InsightsPage() {
  const { subscriptions, loading, error } = useSubscriptions()
  const { preferredCurrency, rate } = useCurrencyRate()
  const { currentUser } = useContext(AuthContext)

  const [comparison, setComparison] = useState(null)

  const showMoney = (amount) =>
    formatCurrency(
      (Number(amount) || 0) * rate,
      preferredCurrency,
    )

    useEffect(() => {
    if (!currentUser) return
    let cancelled = false

    async function loadComparison() {
      try {
        const [bankTxns, manualTxns, paymentsPerSub] = await Promise.all([
          getBankTransactions({ limit: 500 }).catch(() => []),
          getTransactions(currentUser).catch(() => []),
          Promise.all(
            subscriptions.map((s) =>
              getPayments(s.id)
                .then((payments) => [s.id, payments])
                .catch(() => [s.id, []])
            )
          ),
        ])

        if (!cancelled) {
          const paymentsBySubscriptionId = Object.fromEntries(paymentsPerSub)
          setComparison(
            compareMonthToPrevious(
              [...bankTxns, ...manualTxns],
              subscriptions,
              paymentsBySubscriptionId,
            )
          )
        }
      } catch (err) {
        console.error('Failed to load month comparison:', err)
      }
    }

    loadComparison()
    return () => {
      cancelled = true
    }
  }, [currentUser, subscriptions])

  if (loading) {
    return (
      <AppShell activeNav="Insights">
        <p>Loading insights…</p>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell activeNav="Insights">
        <p>Could not load insights: {error.message}</p>
      </AppShell>
    )
  }

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status?.toLowerCase() !== 'cancelled',
  )

  const totalMonthlySpend = calculateTotalMonthlySpend(subscriptions)

  const breakdown = activeSubscriptions
    .map((s) => ({
      name: s.name,
      monthlyAmount: normalizeSubscriptionToMonthly(
        s.amount,
        s.billingCycle,
      ),
      billingCycle: s.billingCycle,
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount)

  return (
    <AppShell activeNav="Insights">
      <Card>
        <h3>Total monthly spend</h3>

        <p className="insights-total">
          {showMoney(totalMonthlySpend)}
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3>This month vs last month</h3>

        {!comparison ? (
          <p>Loading comparison…</p>
        ) : (
          <div className="insights-comparison">
            <div className="insights-comparison__month">
              <p className="insights-comparison__label">Last month</p>
              <p className="insights-comparison__amount">
                {showMoney(comparison.previousMonth)}
              </p>
            </div>

            <div className={`insights-comparison__arrow ${comparison.isIncrease ? 'insights-comparison__arrow--up' : 'insights-comparison__arrow--down'}`}>
              {comparison.isIncrease ? '↑' : '↓'}
              {comparison.percentChange !== null && (
                <span>{Math.abs(comparison.percentChange).toFixed(0)}%</span>
              )}
            </div>

            <div className="insights-comparison__month">
              <p className="insights-comparison__label">This month</p>
              <p className="insights-comparison__amount">
                {showMoney(comparison.currentMonth)}
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3>Spend by subscription</h3>

        {breakdown.length === 0 ? (
          <p>No active subscriptions yet.</p>
        ) : (
          <ul className="insights-list">
            {breakdown.map((item) => {
              const percent =
                totalMonthlySpend > 0
                  ? (item.monthlyAmount / totalMonthlySpend) * 100
                  : 0

              return (
                <li
                  key={item.name}
                  className="insights-list__item"
                >
                  <div className="insights-list__header">
                    <span className="insights-list__name">
                      {item.name}
                    </span>

                    <span className="insights-list__amount">
                      {showMoney(item.monthlyAmount)}/mo
                    </span>
                  </div>

                  <div className="insights-bar">
                    <div
                      className="insights-bar__fill"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </AppShell>
  )
}

export default InsightsPage