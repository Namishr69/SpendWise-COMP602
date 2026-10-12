import { useContext, useEffect, useState } from 'react'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { useTranslations } from '../hooks/useTranslations.js'
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const INSIGHTS_TEXT = [
  'Loading insights...',
  'Could not load insights:',
  'Total monthly spend',
  'This month vs last month',
  'Loading comparison...',
  'Last month',
  'This month',
  'Spend by subscription',
  'No active subscriptions yet.',
  'per month',
  'Spend breakdown',
]

function InsightsPage() {
  const {
    subscriptions,
    loading,
    error,
  } = useSubscriptions()

  const {
    preferredCurrency,
    rate,
  } = useCurrencyRate()

  const { currentUser } = useContext(AuthContext)

  const [
    loadingInsightsText,
    loadErrorText,
    totalMonthlySpendText,
    comparisonTitleText,
    loadingComparisonText,
    lastMonthText,
    thisMonthText,
    spendBySubscriptionText,
    noActiveSubscriptionsText,
    perMonthText,
    spendBreakdownText,
  ] = useTranslations(INSIGHTS_TEXT)

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
        const [
          bankTxns,
          manualTxns,
          paymentsPerSub,
        ] = await Promise.all([
          getBankTransactions({
            limit: 500,
          }).catch(() => []),

          getTransactions(
            currentUser,
          ).catch(() => []),

          Promise.all(
            subscriptions.map((subscription) =>
              getPayments(subscription.id)
                .then((payments) => [
                  subscription.id,
                  payments,
                ])
                .catch(() => [
                  subscription.id,
                  [],
                ]),
            ),
          ),
        ])

        if (!cancelled) {
          const paymentsBySubscriptionId =
            Object.fromEntries(
              paymentsPerSub,
            )

          setComparison(
            compareMonthToPrevious(
              [
                ...bankTxns,
                ...manualTxns,
              ],
              subscriptions,
              paymentsBySubscriptionId,
            ),
          )
        }
      } catch (err) {
        console.error(
          'Failed to load month comparison:',
          err,
        )
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
        <p>{loadingInsightsText}</p>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell activeNav="Insights">
        <p>
          {loadErrorText} {error.message}
        </p>
      </AppShell>
    )
  }

  const activeSubscriptions =
    subscriptions.filter(
      (subscription) =>
        subscription.status?.toLowerCase() !==
        'cancelled',
    )

  const totalMonthlySpend =
    calculateTotalMonthlySpend(
      subscriptions,
    )

  const breakdown = activeSubscriptions
    .map((subscription) => ({
      name: subscription.name,
      monthlyAmount:
        normalizeSubscriptionToMonthly(
          subscription.amount,
          subscription.billingCycle,
        ),
      billingCycle:
        subscription.billingCycle,
    }))
    .sort(
      (a, b) =>
        b.monthlyAmount -
        a.monthlyAmount,
    )

  const pieColors = [
    '#1f3b2c',
    '#7c9473',
    '#e8c468',
    '#d9b65b',
    '#5c6b60',
    '#8fa37e',
  ]

  const pieData = breakdown.map(
    (item) => ({
      name: item.name,
      value: item.monthlyAmount,
    }),
  )

  const barData = comparison
    ? [
        {
          name: lastMonthText,
          amount:
            comparison.previousMonth,
        },
        {
          name: thisMonthText,
          amount:
            comparison.currentMonth,
        },
      ]
    : []

  return (
    <AppShell activeNav="Insights">
      <Card>
        <h3>{totalMonthlySpendText}</h3>

        <p className="insights-total">
          {showMoney(totalMonthlySpend)}
        </p>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3>{comparisonTitleText}</h3>

        {!comparison ? (
          <p>{loadingComparisonText}</p>
        ) : (
          <>
            <div className="insights-comparison">
              <div className="insights-comparison__month">
                <p className="insights-comparison__label">
                  {lastMonthText}
                </p>

                <p className="insights-comparison__amount">
                  {showMoney(
                    comparison.previousMonth,
                  )}
                </p>
              </div>

              <div
                className={`insights-comparison__arrow ${
                  comparison.isIncrease
                    ? 'insights-comparison__arrow--up'
                    : 'insights-comparison__arrow--down'
                }`}
              >
                {comparison.isIncrease
                  ? '↑'
                  : '↓'}

                {comparison.percentChange !==
                  null && (
                  <span>
                    {Math.abs(
                      comparison.percentChange,
                    ).toFixed(0)}
                    %
                  </span>
                )}
              </div>

              <div className="insights-comparison__month">
                <p className="insights-comparison__label">
                  {thisMonthText}
                </p>

                <p className="insights-comparison__amount">
                  {showMoney(
                    comparison.currentMonth,
                  )}
                </p>
              </div>
            </div>

            <div
              style={{
                width: '100%',
                height: 200,
                marginTop: 20,
              }}
            >
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <XAxis
                    dataKey="name"
                    stroke="var(--color-ink-soft)"
                    fontSize={13}
                  />

                  <YAxis
                    stroke="var(--color-ink-soft)"
                    fontSize={13}
                  />

                  <Tooltip
                    formatter={(value) =>
                      showMoney(value)
                    }
                  />

                  <Bar
                    dataKey="amount"
                    fill="#1f3b2c"
                    radius={[
                      6,
                      6,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3>
          {spendBySubscriptionText}
        </h3>

        {breakdown.length === 0 ? (
          <p>
            {noActiveSubscriptionsText}
          </p>
        ) : (
          <ul className="insights-list">
            {breakdown.map((item) => {
              const percent =
                totalMonthlySpend > 0
                  ? (item.monthlyAmount /
                      totalMonthlySpend) *
                    100
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
                      {showMoney(
                        item.monthlyAmount,
                      )}{' '}
                      / {perMonthText}
                    </span>
                  </div>

                  <div className="insights-bar">
                    <div
                      className="insights-bar__fill"
                      style={{
                        width: `${percent}%`,
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <h3>{spendBreakdownText}</h3>

        {pieData.length === 0 ? (
          <p>
            {noActiveSubscriptionsText}
          </p>
        ) : (
          <div
            style={{
              width: '100%',
              height: 260,
            }}
          >
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {pieData.map(
                    (entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={
                          pieColors[
                            index %
                              pieColors.length
                          ]
                        }
                      />
                    ),
                  )}
                </Pie>

                <Tooltip
                  formatter={(value) =>
                    showMoney(value)
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </AppShell>
  )
}

export default InsightsPage