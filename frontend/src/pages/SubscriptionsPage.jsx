import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useSubscriptions } from '../context/subscriptionsContext'
import './SubscriptionsPage.css'

function SubscriptionsPage() {
  const { subscriptions, loading, error, deleteSubscription } = useSubscriptions()
  const [deleting, setDeleting] = useState(null)

  if (loading) {
    return (
      <AppShell activeNav="Subscriptions">
        <p>Loading subscriptions…</p>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell activeNav="Subscriptions">
        <p>Could not load subscriptions: {error.message}</p>
      </AppShell>
    )
  }

  return (
    <AppShell activeNav="Subscriptions">
      <header className="subscriptions-header">
        <div>
          <p className="subscriptions-eyebrow">SpendWise</p>
          <h1>Subscriptions</h1>
          <p>View and manage your recurring payments.</p>
        </div>

        <Link className="subscriptions-add" to="/subscriptions/new">
          + Add subscription
        </Link>
      </header>

      {subscriptions.length === 0 ? (
        <p>No subscriptions yet.</p>
      ) : (
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

              <div className="subscription-card__actions">
                <Link
                  className="subscription-link"
                  to={`/subscriptions/${subscription.id}`}
                >
                  View details
                </Link>

                <button
                  className="subscription-delete"
                  disabled={deleting === subscription.id}
                  onClick={async () => {
                    if (!window.confirm(`Delete "${subscription.name}"? This cannot be undone.`)) return
                    setDeleting(subscription.id)
                    try {
                      await deleteSubscription(subscription.id)
                    } catch {
                      alert('Failed to delete subscription.')
                    } finally {
                      setDeleting(null)
                    }
                  }}
                >
                  {deleting === subscription.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </Card>
          ))}
        </section>
      )}
    </AppShell>
  )
}

export default SubscriptionsPage
