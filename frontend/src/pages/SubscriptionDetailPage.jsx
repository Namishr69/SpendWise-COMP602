import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import SubscriptionNotes from '../components/SubscriptionNotes'
import { useSubscriptions } from '../context/subscriptionsContext'
import { getPayments, createPayment } from '../api/subscriptionApi'
import './SubscriptionDetailPage.css'

function localToday() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function localDateFromISO(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function SubscriptionDetailPage() {
  const { subscriptionId } = useParams()
  const { loading, getSubscription, updateSubscription } = useSubscriptions()
  const subscription = getSubscription(subscriptionId)

  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentDate, setPaymentDate] = useState(localToday())
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!subscription) return

    let cancelled = false

    async function loadPayments() {
      try {
        const data = await getPayments(subscription.id)
        if (!cancelled) setPayments(data)
      } catch {
        if (!cancelled) setPayments([])
      } finally {
        if (!cancelled) setPaymentsLoading(false)
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
        <p>Loading subscription…</p>
      </AppShell>
    )
  }

  if (!subscription) {
    return (
      <AppShell activeNav="Subscriptions">
        <h1>Subscription not found</h1>
        <Link to="/subscriptions">Back to subscriptions</Link>
      </AppShell>
    )
  }

  const totalSpent = payments.reduce(
    (total, payment) => total + payment.amount,
    0,
  )

  async function handleAddPayment(event) {
    event.preventDefault()

    const amount = Number(paymentAmount)

    if (!paymentDate) {
      setPaymentError('Enter a payment date.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Enter an amount greater than zero.')
      return
    }

    setAdding(true)
    setPaymentError('')

    try {
      const created = await createPayment(subscription.id, {
        date: paymentDate,
        amount,
      })
      setPayments((current) => [created, ...current])
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
        <Link to="/subscriptions">← Back to subscriptions</Link>

        <Link
          className="edit-subscription-link"
          to={`/subscriptions/${subscription.id}/edit`}
        >
          Edit subscription
        </Link>
      </div>

      <header className="detail-header">
        <h1>{subscription.name}</h1>
        <p>
          ${subscription.amount.toFixed(2)} /{' '}
          {subscription.billingCycle.toLowerCase()}
        </p>
      </header>

      <section className="detail-summary">
        <Card>
          <h2>Total spent</h2>
          <p className="detail-total">${totalSpent.toFixed(2)}</p>
        </Card>

        <Card>
          <h2>Next payment</h2>
          <p>{subscription.nextPaymentDate || 'Not set'}</p>
        </Card>

        <Card>
          <h2>Subscription date</h2>
          <p>
            {subscription.subscriptionDate ||
              localDateFromISO(subscription.createdAt) ||
              'Not set'}
          </p>
        </Card>

        <Card>
          <h2>Status</h2>
          <p>{subscription.status}</p>
        </Card>
      </section>

      <SubscriptionNotes
        notes={subscription.notes}
        onSave={async (text) => {
          await updateSubscription(subscription.id, { notes: text })
        }}
        onDelete={async () => {
          await updateSubscription(subscription.id, { notes: '' })
        }}
      />

      <Card className="payment-history">
        <h2>Payment history</h2>

        {paymentsLoading ? (
          <p>Loading payment history…</p>
        ) : payments.length === 0 ? (
          <p>No payment history is available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">Payment date</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.date}</td>
                  <td>${payment.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form className="add-payment-form" onSubmit={handleAddPayment} noValidate>
          <h3>Add payment</h3>

          {paymentError && <p className="add-payment-error">{paymentError}</p>}

          <Input
            id="payment-date"
            label="Payment date"
            type="date"
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
          />

          <Input
            id="payment-amount"
            label="Amount"
            type="number"
            min="0.01"
            step="0.01"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(event.target.value)}
          />

          <Button type="submit" disabled={adding}>
            {adding ? 'Adding…' : 'Add payment'}
          </Button>
        </form>
      </Card>
    </AppShell>
  )
}

export default SubscriptionDetailPage
