import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { motion } from 'motion/react'

import { auth } from '../firebase'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import AnimatedNumber from '../components/ui/AnimatedNumber.jsx'
import {
  EASE_OUT,
  fadeUp,
  hoverLift,
  stagger,
} from '../components/ui/motionPresets.js'
import PriceChangeAlerts from '../components/PriceChangeAlerts.jsx'
import { BudgetContext } from '../context/BudgetProvider.jsx'
import { useSubscriptions } from '../context/subscriptionsContext.js'
import { convertCurrency } from '../api/exchangeRateApi.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { normalizeBudgetToMonthly } from '../utils/budgetCalculations.js'
import { sourceLabel } from '../utils/subscriptionSource.js'
import { getDashboard } from '../api/bankDataApi.js'
import { useAlerts } from '../hooks/useAlerts.js'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { useTranslations } from '../hooks/useTranslations.js'

import './DashboardPage.css'

const EMPTY_DASHBOARD = {
  currency: 'NZD',
  hasData: false,
  stats: {
    spentThisMonth: 0,
    activeSubs: 0,
    dueThisWeek: 0,
    detectedSubs: 0,
  },
  upcomingBills: [],
  recentTransactions: [],
}

const DASHBOARD_TEXT = [
  'Loading dashboard...',
  'Could not load subscriptions:',
  'Could not load your bank data:',
  'No bank data yet',
  'Connect your bank in Settings to see spending, upcoming bills and automatically detected subscriptions.',
  'Spent this month',
  'Active subs',
  'Due this week',
  'Detected subs',
  'Alerts',
  'My Subscriptions',
  'No subscriptions yet',
  'Add your first subscription to start tracking your spending.',
  '+ Add subscription',
  'Current Budget',
  'per month',
  'spent so far',
  'No budget set. Add one in Settings.',
  'No alerts right now.',
  'Upcoming bills',
  'Due',
  'Recent activity',

  // Predefined subscription and budget values.
  'Monthly',
  'Weekly',
  'Quarterly',
  'Yearly',
  'Active',
  'Cancelled',
  'Paused',
]

function formatDate(iso) {
  if (!iso) return ''

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
  })
}

function DashboardPage() {
  const { budget } = useContext(BudgetContext)

  const {
    subscriptions,
    loading: subsLoading,
    error: subsError,
  } = useSubscriptions()

  const {
    preferredCurrency,
    rate,
  } = useCurrencyRate()

  const [
    loadingDashboardText,
    subscriptionsErrorText,
    bankErrorText,
    noBankDataText,
    connectBankText,
    spentThisMonthText,
    activeSubsText,
    dueThisWeekText,
    detectedSubsText,
    alertsText,
    mySubscriptionsText,
    noSubscriptionsText,
    addFirstSubscriptionText,
    addSubscriptionText,
    currentBudgetText,
    perMonthText,
    spentSoFarText,
    noBudgetText,
    noAlertsText,
    upcomingBillsText,
    dueText,
    recentActivityText,
    monthlyText,
    weeklyText,
    quarterlyText,
    yearlyText,
    activeText,
    cancelledText,
    pausedText,
  ] = useTranslations(DASHBOARD_TEXT)

  const showMoney = (amount) =>
    formatCurrency(
      (Number(amount) || 0) * rate,
      preferredCurrency,
    )

  function translatePeriod(period) {
    switch (period?.toLowerCase()) {
      case 'monthly':
        return monthlyText

      case 'weekly':
        return weeklyText

      case 'quarterly':
        return quarterlyText

      case 'yearly':
      case 'annual':
      case 'annually':
        return yearlyText

      default:
        return period || ''
    }
  }

  function translateStatus(status) {
    switch (status?.toLowerCase()) {
      case 'cancelled':
      case 'canceled':
        return cancelledText

      case 'paused':
        return pausedText

      case 'active':
        return activeText

      default:
        return status || activeText
    }
  }

  function getStatusClass(status) {
    switch (status?.toLowerCase()) {
      case 'cancelled':
      case 'canceled':
        return 'cancelled'

      case 'paused':
        return 'paused'

      case 'active':
      default:
        return 'active'
    }
  }

  // Bank-synced figures from ANZ, kept separate from the manually tracked
  // subscriptions above so one failing never blanks the other.
  const [dashboard, setDashboard] =
    useState(EMPTY_DASHBOARD)

  const [bankLoading, setBankLoading] =
    useState(true)

  const [bankError, setBankError] =
    useState(null)

  // Bank figures converted into the user's preferred currency.
  const [bankStats, setBankStats] =
    useState(null)

  const [bills, setBills] =
    useState([])

  const [transactions, setTransactions] =
    useState([])

  // Fetch once we know who is signed in — mirrors SubscriptionsProvider so the
  // Firebase ID token is available when the request goes out.
  useEffect(() => {
    let cancelled = false

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
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
          if (!cancelled) {
            setBankError(err)
          }
        } finally {
          if (!cancelled) {
            setBankLoading(false)
          }
        }
      },
    )

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // Convert bank money to the preferred currency.
  // This part was already working, so we keep the existing logic.
  useEffect(() => {
    let cancelled = false

    async function convert() {
      const source =
        dashboard.currency || 'NZD'

      const {
        stats: s,
        upcomingBills,
        recentTransactions,
      } = dashboard

      const toPreferred = (amount, from) =>
        convertCurrency(
          amount,
          from || source,
          preferredCurrency,
        )

      try {
        const [spent, due] =
          await Promise.all([
            toPreferred(
              s.spentThisMonth,
            ),
            toPreferred(
              s.dueThisWeek,
            ),
          ])

        const convertedBills =
          await Promise.all(
            upcomingBills.map(
              async (bill) => ({
                ...bill,
                amount:
                  await toPreferred(
                    bill.amount,
                    bill.currency,
                  ),
                currency:
                  preferredCurrency,
              }),
            ),
          )

        const convertedTxns =
          await Promise.all(
            recentTransactions.map(
              async (transaction) => ({
                ...transaction,
                amount:
                  await toPreferred(
                    transaction.amount,
                    transaction.currency,
                  ),
                currency:
                  preferredCurrency,
              }),
            ),
          )

        if (cancelled) {
          return
        }

        setBankStats({
          spentThisMonth: spent,
          dueThisWeek: due,
          detectedSubs:
            s.detectedSubs,
          currency:
            preferredCurrency,
          from: dashboard,
        })

        setBills(convertedBills)
        setTransactions(
          convertedTxns,
        )
      } catch (err) {
        console.error(
          'Currency conversion failed:',
          err,
        )

        // Fall back to source-currency figures so the page still renders.
        if (cancelled) {
          return
        }

        setBankStats({
          spentThisMonth:
            s.spentThisMonth,
          dueThisWeek:
            s.dueThisWeek,
          detectedSubs:
            s.detectedSubs,
          currency: source,
          from: dashboard,
        })

        setBills(upcomingBills)
        setTransactions(
          recentTransactions,
        )
      }
    }

    convert()

    return () => {
      cancelled = true
    }
  }, [
    dashboard,
    preferredCurrency,
  ])

  const {
    alerts,
    activeSubscriptions,
    totalMonthlySpend,
    nearBudgetLimit,
  } = useAlerts(
    subscriptions,
    budget,
    preferredCurrency,
    rate,
  )

  if (subsLoading) {
    return (
      <AppShell activeNav="Dashboard">
        <p>
          {loadingDashboardText}
        </p>
      </AppShell>
    )
  }

  const now = new Date()

  const weekFromNow = new Date(
    now.getTime() +
      7 * 24 * 60 * 60 * 1000,
  )

  const dueThisWeekTotal =
    activeSubscriptions
      .filter((subscription) => {
        if (
          !subscription.nextPaymentDate
        ) {
          return false
        }

        const due = new Date(
          subscription.nextPaymentDate,
        )

        return (
          due >= now &&
          due <= weekFromNow
        )
      })
      .reduce(
        (sum, subscription) =>
          sum +
          (Number(
            subscription.amount,
          ) || 0),
        0,
      )

  const sorted = [
    ...subscriptions,
  ].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  // Prefer the bank's spend figure once a connection has synced.
  // Otherwise use manually tracked subscription spending.
  // bankStats lags one conversion behind a new dashboard response; until it
  // catches up it still holds the empty placeholder's zeros, which the
  // count-up would otherwise animate down to.
  const bankStatsReady =
    bankStats?.from === dashboard

  const useBankSpend =
    dashboard.hasData && bankStatsReady

  const spentValue = useBankSpend
    ? bankStats.spentThisMonth
    : totalMonthlySpend

  const formatSpent = useBankSpend
    ? (amount) =>
        formatCurrency(
          amount,
          bankStats.currency,
        )
    : showMoney

  const budgetPercent = budget
    ? Math.min(
        100,
        (totalMonthlySpend /
          normalizeBudgetToMonthly(
            budget.amount,
            budget.period,
          )) *
          100,
      )
    : 0

  return (
    <AppShell activeNav="Dashboard">
      {subsError && (
        <Card className="dashboard-notice">
          <p>
            {subscriptionsErrorText}{' '}
            {subsError.message}
          </p>
        </Card>
      )}

      {bankError && (
        <Card className="dashboard-notice">
          <p>
            {bankErrorText}{' '}
            {bankError.message}
          </p>
        </Card>
      )}

      {!bankLoading &&
        !bankError &&
        !dashboard.hasData && (
          <Card className="dashboard-notice">
            <h3>
              {noBankDataText}
            </h3>

            <p>
              {connectBankText}
            </p>
          </Card>
        )}

      <PriceChangeAlerts />

      <motion.div
        className="dashboard-stats"
        variants={stagger()}
        initial="hidden"
        animate="show"
      >
        <Card
          tone="forest"
          className="dashboard-stat"
          variants={fadeUp}
          whileHover={hoverLift}
        >
          <p>
            {spentThisMonthText}
          </p>

          <h2 className="money">
            <AnimatedNumber
              value={spentValue}
              format={formatSpent}
            />
          </h2>
        </Card>

        <Card
          tone="forest"
          className="dashboard-stat"
          variants={fadeUp}
          whileHover={hoverLift}
        >
          <p>
            {activeSubsText}
          </p>

          <h2>
            <AnimatedNumber
              value={
                activeSubscriptions.length
              }
            />
          </h2>
        </Card>

        <Card
          tone="forest"
          className="dashboard-stat"
          variants={fadeUp}
          whileHover={hoverLift}
        >
          <p>
            {dueThisWeekText}
          </p>

          <h2 className="money">
            <AnimatedNumber
              value={dueThisWeekTotal}
              format={showMoney}
            />
          </h2>
        </Card>

        <Card
          tone="forest"
          className="dashboard-stat"
          variants={fadeUp}
          whileHover={hoverLift}
        >
          <p>
            {dashboard.hasData
              ? detectedSubsText
              : alertsText}
          </p>

          <h2>
            <AnimatedNumber
              value={
                dashboard.hasData &&
                bankStatsReady
                  ? bankStats.detectedSubs
                  : alerts.length
              }
            />
          </h2>
        </Card>
      </motion.div>

      <motion.div
        className="dashboard-grid"
        variants={stagger(0.15, 0.08)}
        initial="hidden"
        animate="show"
      >
        <Card variants={fadeUp}>
          <h3>
            {mySubscriptionsText}
          </h3>

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
                <rect
                  x="8"
                  y="14"
                  width="32"
                  height="22"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="2"
                />

                <path
                  d="M8 22h32"
                  stroke="currentColor"
                  strokeWidth="2"
                />

                <line
                  x1="14"
                  y1="28"
                  x2="22"
                  y2="28"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <line
                  x1="14"
                  y1="32"
                  x2="18"
                  y2="32"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <circle
                  cx="36"
                  cy="34"
                  r="8"
                  fill="var(--color-white)"
                  stroke="currentColor"
                  strokeWidth="2"
                />

                <line
                  x1="36"
                  y1="30"
                  x2="36"
                  y2="38"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                <line
                  x1="32"
                  y1="34"
                  x2="40"
                  y2="34"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

              <p className="dashboard-empty__title">
                {noSubscriptionsText}
              </p>

              <p className="dashboard-empty__hint">
                {
                  addFirstSubscriptionText
                }
              </p>

              <Link
                to="/subscriptions/new"
                className="dashboard-empty__cta"
              >
                {addSubscriptionText}
              </Link>
            </div>
          ) : (
            <motion.ul
              className="dashboard-subs"
              variants={stagger(0.1, 0.04)}
            >
              {sorted.map(
                (subscription) => (
                  <motion.li
                    key={
                      subscription.id
                    }
                    className="dashboard-subs__item"
                    variants={fadeUp}
                  >
                    <Link
                      to={`/subscriptions/${subscription.id}`}
                      className="dashboard-subs__link"
                    >
                      <div>
                        <p className="dashboard-subs__name">
                          {
                            subscription.name
                          }
                        </p>

                        <p className="dashboard-subs__meta">
                          {showMoney(
                            subscription.amount,
                          )}{' '}
                          /{' '}
                          {translatePeriod(
                            subscription.billingCycle,
                          )}
                        </p>
                      </div>

                      <span
                        className={`dashboard-subs__status dashboard-subs__status--${getStatusClass(
                          subscription.status,
                        )}`}
                      >
                        {translateStatus(
                          subscription.status,
                        )}
                      </span>
                    </Link>
                  </motion.li>
                ),
              )}
            </motion.ul>
          )}
        </Card>

        <motion.div
          className="dashboard-side"
          variants={stagger(0, 0.08)}
        >
          <Card variants={fadeUp}>
            <h3>
              {currentBudgetText}
            </h3>

            {budget ? (
              <>
                <p className="dashboard-budget-amount">
                  {showMoney(
                    budget.amount,
                  )}{' '}
                  /{' '}
                  {translatePeriod(
                    budget.period,
                  )}
                </p>

                <p className="dashboard-budget-equivalent">
                  ≈{' '}
                  {showMoney(
                    normalizeBudgetToMonthly(
                      budget.amount,
                      budget.period,
                    ),
                  )}{' '}
                  {perMonthText}
                </p>

                <div className="dashboard-budget-bar">
                  <motion.div
                    className={`dashboard-budget-bar__fill ${
                      nearBudgetLimit
                        ? 'dashboard-budget-bar__fill--warning'
                        : ''
                    }`}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${budgetPercent}%`,
                    }}
                    transition={{
                      duration: 0.9,
                      delay: 0.3,
                      ease: EASE_OUT,
                    }}
                  />
                </div>

                <p className="dashboard-budget-spent">
                  {showMoney(
                    totalMonthlySpend,
                  )}{' '}
                  {spentSoFarText}
                </p>
              </>
            ) : (
              <p>
                {noBudgetText}
              </p>
            )}
          </Card>

          <Card variants={fadeUp}>
            <h3>{alertsText}</h3>

            <motion.div
              className="dashboard-chips"
              variants={stagger(0.1, 0.05)}
            >
              {alerts.length === 0 ? (
                <p>
                  {noAlertsText}
                </p>
              ) : (
                alerts.map(
                  (alert) => (
                    <motion.span
                      key={alert}
                      className="dashboard-chip"
                      variants={fadeUp}
                    >
                      {alert}
                    </motion.span>
                  ),
                )
              )}
            </motion.div>
          </Card>

          {bills.length > 0 && (
            <Card variants={fadeUp}>
              <h3>
                {upcomingBillsText}
              </h3>

              <motion.ul
                className="dashboard-list"
                variants={stagger(0.1, 0.04)}
              >
                {bills.map(
                  (bill) => (
                    <motion.li
                      variants={fadeUp}
                      key={`${bill.name}-${bill.due}`}
                      className="dashboard-list__item"
                    >
                      <div>
                        <p className="dashboard-list__name">
                          {bill.name}
                        </p>

                        <p className="dashboard-list__due">
                          {dueText}{' '}
                          {formatDate(
                            bill.due,
                          )}
                        </p>
                      </div>

                      <span className="money">
                        {formatCurrency(
                          bill.amount,
                          bill.currency,
                        )}
                      </span>
                    </motion.li>
                  ),
                )}
              </motion.ul>
            </Card>
          )}

          {transactions.length >
            0 && (
            <Card variants={fadeUp}>
              <h3>
                {recentActivityText}
              </h3>

              <motion.ul
                className="dashboard-list"
                variants={stagger(0.1, 0.04)}
              >
                {transactions.map(
                  (transaction) => (
                    <motion.li
                      variants={fadeUp}
                      key={
                        transaction.transactionId ||
                        `${transaction.merchant}-${transaction.bookedAt}`
                      }
                      className="dashboard-list__item"
                    >
                      <div>
                        <p className="dashboard-list__name">
                          {transaction.merchant ||
                            transaction.description}
                        </p>

                        <p className="dashboard-list__due">
                          {formatDate(
                            transaction.bookedAt,
                          )}
                        </p>
                      </div>

                      <span className="money">
                        {transaction.direction ===
                        'debit'
                          ? '−'
                          : '+'}

                        {formatCurrency(
                          transaction.amount,
                          transaction.currency,
                        )}
                      </span>
                    </motion.li>
                  ),
                )}
              </motion.ul>
            </Card>
          )}
        </motion.div>
      </motion.div>
    </AppShell>
  )
}

export default DashboardPage