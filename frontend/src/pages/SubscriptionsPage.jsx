import { Link } from 'react-router-dom'
import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import { useSubscriptions } from '../context/subscriptionsContext'
import './SubscriptionsPage.css'

function SubscriptionsPage() {
  const { subscriptions } = useSubscriptions()

  return (
    <AppShell activeNav="Subscriptions">
      <header className="subscriptions-header">
        <div>
          <p className="subscriptions-eyebrow">SpendWise</p>
          <h1>Subscriptions</h1>
          <p>View and manage your recurring payments.</p>
        </div>
      </header>

      <section className="subscriptions-grid">
        {subscriptions.map((subscription) => (
          <Card key={subscription.id} className="subscription-card">
            <div>
              <h2>{subscription.name}</h2>
              <p>
                ${subscription.amount.toFixed(2)} /{' '}
                {subscription.billingCycle.toLowerCase()}
              </p>
              <p>Next payment: {subscription.nextPaymentDate}</p>
              <p>Status: {subscription.status}</p>
            </div>

            <Link
              className="subscription-link"
              to={`/subscriptions/${subscription.id}`}
            >
              View details
            </Link>
          </Card>
        ))}
      </section>
    </AppShell>
  )
}

export default SubscriptionsPage
