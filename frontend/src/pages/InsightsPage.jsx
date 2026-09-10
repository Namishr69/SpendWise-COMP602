import { useContext } from 'react'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { CurrencyContext } from '../context/currencyContext.js'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { normalizeSubscriptionToMonthly, calculateTotalMonthlySpend } from '../utils/budgetCalculations.js'
import './InsightsPage.css'

function InsightsPage() {
  const { preferredCurrency } = useContext(CurrencyContext)
  const { subscriptions, loading, error } = useSubscriptions()

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
      monthlyAmount: normalizeSubscriptionToMonthly(s.amount, s.billingCycle),
      billingCycle: s.billingCycle,
    }))
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount)

  return (
    <AppShell activeNav="Insights">
      <Card>
        <h3>Total monthly spend</h3>
        <p className="insights-total">
          {formatCurrency(totalMonthlySpend, preferredCurrency)}
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3>Spend by subscription</h3>

        {breakdown.length === 0 ? (
          <p>No active subscriptions yet.</p>
        ) : (
          <ul className="insights-list">
            {breakdown.map((item) => {
              const percent = totalMonthlySpend > 0
                ? (item.monthlyAmount / totalMonthlySpend) * 100
                : 0

              return (
                <li key={item.name} className="insights-list__item">
                  <div className="insights-list__header">
                    <span className="insights-list__name">{item.name}</span>
                    <span className="insights-list__amount">
                      {formatCurrency(item.monthlyAmount, preferredCurrency)}/mo
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