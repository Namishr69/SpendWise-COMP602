import { Link, useParams } from 'react-router-dom'
import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import { useSubscriptions } from '../context/subscriptionsContext'
import './SubscriptionDetailPage.css'

function SubscriptionDetailPage() {
  const { subscriptionId } = useParams()
  const { loading, getSubscription } = useSubscriptions()
  const subscription = getSubscription(subscriptionId)

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

  const paymentHistory = subscription.paymentHistory || []
  const totalSpent = paymentHistory.reduce(
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
          <p>{subscription.nextPaymentDate}</p>
        </Card>

        <Card>
          <h2>Status</h2>
          <p>{subscription.status}</p>
        </Card>
      </section>

      <Card className="payment-history">
        <h2>Payment history</h2>

        {paymentHistory.length === 0 ? (
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
              {paymentHistory.map((payment) => (
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
