import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import SubscriptionNotes from '../components/SubscriptionNotes'
import { useSubscriptions } from '../context/subscriptionsContext'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { useTranslations } from '../hooks/useTranslations.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import {
  getPayments,
  createPayment,
} from '../api/subscriptionApi'

import './SubscriptionDetailPage.css'

const SUBSCRIPTION_DETAIL_TEXT = [
  'Loading subscription...',
  'Subscription not found',
  'Back to subscriptions',
  'Edit subscription',
  'Total spent',
  'Next payment',
  'Not set',
  'Subscription date',
  'Status',
  'Payment history',
  'Loading payment history...',
  'No payment history is available.',
  'Payment date',
  'Amount',
  'Add payment',
  'Adding...',
  'Enter a payment date.',
  'Enter an amount greater than zero.',
  'Monthly',
  'Weekly',
  'Quarterly',
  'Yearly',
  'Active',
  'Cancelled',
]

function localToday() {
  const now = new Date()

  const month = String(
    now.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    now.getDate(),
  ).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}

function localDateFromISO(iso) {
  if (!iso) return ''

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    date.getDate(),
  ).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

function SubscriptionDetailPage() {
  const { subscriptionId } = useParams()

  const {
    loading,
    getSubscription,
    updateSubscription,
  } = useSubscriptions()

  const subscription =
    getSubscription(subscriptionId)

  const {
    preferredCurrency,
    rate,
  } = useCurrencyRate()

  const [
    loadingSubscriptionText,
    subscriptionNotFoundText,
    backToSubscriptionsText,
    editSubscriptionText,
    totalSpentText,
    nextPaymentText,
    notSetText,
    subscriptionDateText,
    statusText,
    paymentHistoryText,
    loadingPaymentHistoryText,
    noPaymentHistoryText,
    paymentDateText,
    amountText,
    addPaymentText,
    addingText,
    paymentDateErrorText,
    amountErrorText,
    monthlyText,
    weeklyText,
    quarterlyText,
    yearlyText,
    activeText,
    cancelledText,
  ] = useTranslations(
    SUBSCRIPTION_DETAIL_TEXT,
  )

  const showMoney = (amount) =>
    formatCurrency(
      (Number(amount) || 0) * rate,
      preferredCurrency,
    )

  function translateBillingCycle(
    billingCycle,
  ) {
    switch (
      billingCycle?.toLowerCase()
    ) {
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
        return billingCycle || ''
    }
  }

  function translateStatus(
    subscriptionStatus,
  ) {
    switch (
      subscriptionStatus?.toLowerCase()
    ) {
      case 'active':
        return activeText

      case 'cancelled':
      case 'canceled':
        return cancelledText

      default:
        return subscriptionStatus || ''
    }
  }

  const [payments, setPayments] =
    useState([])

  const [
    paymentsLoading,
    setPaymentsLoading,
  ] = useState(true)

  const [
    paymentDate,
    setPaymentDate,
  ] = useState(localToday())

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState('')

  const [
    paymentError,
    setPaymentError,
  ] = useState('')

  const [adding, setAdding] =
    useState(false)

  useEffect(() => {
    if (!subscription) return

    let cancelled = false

    async function loadPayments() {
      setPaymentsLoading(true)

      try {
        const data = await getPayments(
          subscription.id,
        )

        if (!cancelled) {
          setPayments(data)
        }
      } catch {
        if (!cancelled) {
          setPayments([])
        }
      } finally {
        if (!cancelled) {
          setPaymentsLoading(false)
        }
      }
    }

    loadPayments()

    return () => {
      cancelled = true
    }
  }, [subscription])

  if (loading) {
    return (
      <AppShell activeNav="Subscriptions">
        <p>
          {loadingSubscriptionText}
        </p>
      </AppShell>
    )
  }

  if (!subscription) {
    return (
      <AppShell activeNav="Subscriptions">
        <h1>
          {subscriptionNotFoundText}
        </h1>

        <Link to="/subscriptions">
          {backToSubscriptionsText}
        </Link>
      </AppShell>
    )
  }

  const totalSpent = payments.reduce(
    (total, payment) =>
      total +
      (Number(payment.amount) || 0),
    0,
  )

  async function handleAddPayment(
    event,
  ) {
    event.preventDefault()

    const amount =
      Number(paymentAmount)

    if (!paymentDate) {
      setPaymentError(
        paymentDateErrorText,
      )
      return
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setPaymentError(
        amountErrorText,
      )
      return
    }

    setAdding(true)
    setPaymentError('')

    try {
      const created =
        await createPayment(
          subscription.id,
          {
            date: paymentDate,
            amount,
          },
        )

      setPayments((current) => [
        created,
        ...current,
      ])

      setPaymentDate(localToday())
      setPaymentAmount('')
    } catch (err) {
      setPaymentError(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <AppShell activeNav="Subscriptions">
      <div className="detail-actions">
        <Link to="/subscriptions">
          ← {backToSubscriptionsText}
        </Link>

        <Link
          className="edit-subscription-link"
          to={`/subscriptions/${subscription.id}/edit`}
        >
          {editSubscriptionText}
        </Link>
      </div>

      <header className="detail-header">
        <h1>
          {subscription.name}
        </h1>

        <p>
          {showMoney(
            subscription.amount,
          )}{' '}
          /{' '}
          {translateBillingCycle(
            subscription.billingCycle,
          )}
        </p>
      </header>

      <section className="detail-summary">
        <Card>
          <h2>
            {totalSpentText}
          </h2>

          <p className="detail-total">
            {showMoney(totalSpent)}
          </p>
        </Card>

        <Card>
          <h2>
            {nextPaymentText}
          </h2>

          <p>
            {subscription.nextPaymentDate ||
              notSetText}
          </p>
        </Card>

        <Card>
          <h2>
            {subscriptionDateText}
          </h2>

          <p>
            {subscription.subscriptionDate ||
              localDateFromISO(
                subscription.createdAt,
              ) ||
              notSetText}
          </p>
        </Card>

        <Card>
          <h2>
            {statusText}
          </h2>

          <p>
            {translateStatus(
              subscription.status,
            )}
          </p>
        </Card>
      </section>

      <SubscriptionNotes
        notes={subscription.notes}
        onSave={async (text) => {
          await updateSubscription(
            subscription.id,
            {
              notes: text,
            },
          )
        }}
        onDelete={async () => {
          await updateSubscription(
            subscription.id,
            {
              notes: '',
            },
          )
        }}
      />

      <Card className="payment-history">
        <h2>
          {paymentHistoryText}
        </h2>

        {paymentsLoading ? (
          <p>
            {loadingPaymentHistoryText}
          </p>
        ) : payments.length === 0 ? (
          <p>
            {noPaymentHistoryText}
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">
                  {paymentDateText}
                </th>

                <th scope="col">
                  {amountText}
                </th>
              </tr>
            </thead>

            <tbody>
              {payments.map(
                (payment) => (
                  <tr key={payment.id}>
                    <td>
                      {payment.date}
                    </td>

                    <td>
                      {showMoney(
                        payment.amount,
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}

        <form
          className="add-payment-form"
          onSubmit={handleAddPayment}
          noValidate
        >
          <h3>
            {addPaymentText}
          </h3>

          {paymentError && (
            <p className="add-payment-error">
              {paymentError}
            </p>
          )}

          <Input
            id="payment-date"
            label={paymentDateText}
            type="date"
            value={paymentDate}
            onChange={(event) =>
              setPaymentDate(
                event.target.value,
              )
            }
          />

          <Input
            id="payment-amount"
            label={`${amountText} (${preferredCurrency})`}
            type="number"
            min="0.01"
            step="0.01"
            value={paymentAmount}
            onChange={(event) =>
              setPaymentAmount(
                event.target.value,
              )
            }
          />

          <Button
            type="submit"
            disabled={adding}
          >
            {adding
              ? addingText
              : addPaymentText}
          </Button>
        </form>
      </Card>
    </AppShell>
  )
}

export default SubscriptionDetailPage