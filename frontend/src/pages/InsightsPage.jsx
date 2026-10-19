import { useContext, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { useTranslations } from '../hooks/useTranslations.js'
import { EASE_OUT } from '../components/ui/motionPresets.js'
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
  'Total per month',
  'Other',
]

// Six series colours, defined per theme in InsightsPage.css. The order was
// checked for colour-blind separation in light and dark mode, so keep it.
const SERIES_COLORS = [1, 2, 3, 4, 5, 6].map(
  (slot) => `var(--insights-series-${slot})`,
)

const OTHER_COLOR = 'var(--insights-series-other)'

// Recharts' default tooltip is a white box; match the card surface instead.
const TOOLTIP_STYLE = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-ink)',
}

function formatShare(percent) {
  if (percent > 0 && percent < 1) {
    return '<1%'
  }

  return `${percent.toFixed(0)}%`
}

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
    totalPerMonthText,
    otherText,
  ] = useTranslations(INSIGHTS_TEXT)

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

  // Same rule as calculateTotalMonthlySpend, so the breakdown's shares add up
  // to the total shown above it (paused subscriptions used to be included).
  const activeSubscriptions =
    subscriptions.filter(
      (subscription) =>
        subscription.status === 'Active',
    )

  const totalMonthlySpend =
    calculateTotalMonthlySpend(
      subscriptions,
    )

  const breakdown = activeSubscriptions
    .map((subscription) => ({
      id: subscription.id,
      name: subscription.name,
      monthlyAmount:
        normalizeSubscriptionToMonthly(
          Number(subscription.amount) || 0,
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

  const shareOf = (amount) =>
    totalMonthlySpend > 0
      ? (amount / totalMonthlySpend) * 100
      : 0

  // Up to six subscriptions get their own colour. Past that, the biggest five
  // keep theirs and the rest share one grey "Other" slice.
  const needsOther =
    breakdown.length > SERIES_COLORS.length

  const colouredCount = needsOther
    ? SERIES_COLORS.length - 1
    : breakdown.length

  const coloredBreakdown = breakdown.map(
    (item, index) => ({
      ...item,
      color:
        index < colouredCount
          ? SERIES_COLORS[index]
          : OTHER_COLOR,
    }),
  )

  const pieData = coloredBreakdown
    .slice(0, colouredCount)
    .map((item) => ({
      key: item.id ?? item.name,
      name: item.name,
      value: item.monthlyAmount,
      color: item.color,
    }))

  if (needsOther) {
    pieData.push({
      key: 'other',
      name: otherText,
      value: breakdown
        .slice(colouredCount)
        .reduce(
          (sum, item) =>
            sum + item.monthlyAmount,
          0,
        ),
      color: OTHER_COLOR,
    })
  }

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
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{
                      fill: 'var(--color-surface-alt)',
                    }}
                  />

                  <Bar
                    dataKey="amount"
                    fill="var(--insights-comparison-bar)"
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
            {coloredBreakdown.map((item) => (
              <li
                key={item.id ?? item.name}
                className="insights-list__item"
              >
                <div className="insights-list__header">
                  <span className="insights-list__name">
                    <span
                      className="insights-legend__swatch"
                      style={{
                        background: item.color,
                      }}
                    />

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
                  <motion.div
                    className="insights-bar__fill"
                    style={{
                      background: item.color,
                    }}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${shareOf(item.monthlyAmount)}%`,
                    }}
                    transition={{
                      duration: 0.8,
                      ease: EASE_OUT,
                    }}
                  />
                </div>
              </li>
            ))}
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
          <div className="insights-breakdown">
            <div
              className="insights-donut"
              style={{ height: 280 }}
            >
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="64%"
                    outerRadius="92%"
                    paddingAngle={pieData.length > 1 ? 1 : 0}
                    stroke="var(--color-surface)"
                    strokeWidth={2}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    formatter={(value) =>
                      showMoney(value)
                    }
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="insights-donut__center">
                <span className="insights-donut__center-label">
                  {totalPerMonthText}
                </span>

                <span className="insights-donut__center-amount">
                  {showMoney(totalMonthlySpend)}
                </span>
              </div>
            </div>

            <ul className="insights-legend">
              {pieData.map((entry) => (
                <li
                  key={entry.key}
                  className="insights-legend__item"
                >
                  <span
                    className="insights-legend__swatch"
                    style={{
                      background: entry.color,
                    }}
                  />

                  <span className="insights-legend__name">
                    {entry.name}
                  </span>

                  <span className="insights-legend__amount">
                    {showMoney(entry.value)}
                  </span>

                  <span className="insights-legend__percent">
                    {formatShare(
                      shareOf(entry.value),
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </AppShell>
  )
}

export default InsightsPage