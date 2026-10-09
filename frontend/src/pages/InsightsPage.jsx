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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { LineChart, Line } from 'recharts'
import { getMonthlyTotals } from '../utils/spendingTrend.js'

function InsightsPage() {
  const { subscriptions, loading, error } = useSubscriptions()
  const { preferredCurrency, rate } = useCurrencyRate()
  const { currentUser } = useContext(AuthContext)

  const [comparison, setComparison] = useState(null)
  const [trend, setTrend] = useState(null)

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
          const allTxns = [...bankTxns, ...manualTxns]
          setComparison(compareMonthToPrevious(allTxns, subscriptions, paymentsBySubscriptionId))
          setTrend(getMonthlyTotals(allTxns, subscriptions, paymentsBySubscriptionId))
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

  const pieColors = ['#1f3b2c', '#7c9473', '#e8c468', '#d9b65b', '#5c6b60', '#8fa37e']

  const pieData = breakdown.map((item) => ({
    name: item.name,
    value: item.monthlyAmount,
  }))

  const barData = comparison
    ? [
        { name: 'Last month', amount: comparison.previousMonth },
        { name: 'This month', amount: comparison.currentMonth },
      ]
    : []

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
          <>
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

            <div style={{ width: '100%', height: 200, marginTop: 20 }}>
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <XAxis dataKey="name" stroke="var(--color-ink-soft)" fontSize={13} />
                  <YAxis stroke="var(--color-ink-soft)" fontSize={13} />
                  <Tooltip formatter={(value) => showMoney(value)} />
                  <Bar dataKey="amount" fill="#1f3b2c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3>Spending trend</h3>

        {!trend ? (
          <p>Loading trend…</p>
        ) : (
          <div style={{ width: '100%', height: 220, marginTop: 12 }}>
            <ResponsiveContainer>
              <LineChart data={trend}>
                <XAxis dataKey="label" stroke="var(--color-ink-soft)" fontSize={13} />
                <YAxis stroke="var(--color-ink-soft)" fontSize={13} />
                <Tooltip formatter={(value) => showMoney(value)} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#1f3b2c"
                  strokeWidth={2}
                  dot={{ r: trend.length === 1 ? 5 : 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
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

            <Card style={{ marginTop: 16 }}>
        <h3>Spend breakdown</h3>

        {pieData.length === 0 ? (
          <p>No active subscriptions yet.</p>
        ) : (
          <>
                        <div
              className="insights-donut"
              style={{ position: 'relative', width: '100%', height: 300 }}
            >
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="88%"
                    paddingAngle={0}
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => showMoney(value)} />
                </PieChart>
              </ResponsiveContainer>

              <div className="insights-donut__center">
                <span className="insights-donut__center-label">Total / mo</span>
                <span className="insights-donut__center-amount">
                  {showMoney(totalMonthlySpend)}
                </span>
              </div>
            </div>

            <ul className="insights-legend">
              {pieData.map((entry, index) => {
                const percent =
                  totalMonthlySpend > 0
                    ? (entry.value / totalMonthlySpend) * 100
                    : 0

                return (
                  <li key={entry.name} className="insights-legend__item">
                    <span
                      className="insights-legend__swatch"
                      style={{ background: pieColors[index % pieColors.length] }}
                    />
                    <span className="insights-legend__name">{entry.name}</span>
                    <span className="insights-legend__amount">
                      {showMoney(entry.value)} · {percent.toFixed(0)}%
                    </span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>
    </AppShell>
  )
}

export default InsightsPage