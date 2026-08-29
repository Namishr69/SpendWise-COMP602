import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import { useSubscriptions } from '../context/subscriptionsContext'
import { getPayments } from '../api/subscriptionApi'
import './SubscriptionDetailPage.css'

function SubscriptionDetailPage() {
  const { subscriptionId } = useParams()
  const { loading, getSubscription } = useSubscriptions()
  const subscription = getSubscription(subscriptionId)

  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)

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
          <h2>Status</h2>
          <p>{subscription.status}</p>
        </Card>
      </section>

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
      </Card>
    </AppShell>
  )
}

export default SubscriptionDetailPage
