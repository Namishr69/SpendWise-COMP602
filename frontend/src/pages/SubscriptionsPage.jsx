import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import { useSubscriptions } from '../context/subscriptionsContext'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { sourceLabel } from '../utils/subscriptionSource.js'
import { resolveCancellation } from '../utils/cancellationLinks.js'

import './SubscriptionsPage.css'

function SubscriptionsPage() {
  const {
    subscriptions,
    loading,
    error,
    refresh,
    deleteSubscription,
  } = useSubscriptions()

  const [deleting, setDeleting] = useState(null)

  // The OAuth callback runs a bank sync server-side, so by the time the user
  // lands here new subscriptions may already exist. Re-read on mount rather
  // than trusting whatever the provider loaded at sign-in.
  useEffect(() => {
    refresh({ silent: true }).catch(() => {})
  }, [refresh])

  const { preferredCurrency, rate } = useCurrencyRate()

  const showMoney = (amount) =>
    formatCurrency(
      (Number(amount) || 0) * rate,
      preferredCurrency
    )

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

        <Link
          className="subscriptions-add"
          to="/subscriptions/new"
        >
          + Add subscription
        </Link>
      </header>

      {subscriptions.length === 0 ? (
        <p>No subscriptions yet.</p>
      ) : (
        <section className="subscriptions-grid">
          {subscriptions.map((subscription) => {
            const cancellation = resolveCancellation(subscription.name)

            return (
            <Card
              key={subscription.id}
              className="subscription-card"
            >
              <div>
                <div className="subscription-card__heading">
                  <h2>{subscription.name}</h2>
                  {sourceLabel(subscription.source) && (
                    <span className="subscription-source">
                      {sourceLabel(subscription.source)}
                    </span>
                  )}
                </div>

                <p>
                  {showMoney(subscription.amount)} /{' '}
                  {(subscription.billingCycle || 'Monthly').toLowerCase()}
                </p>

                <p>
                  Next payment: {subscription.nextPaymentDate}
                </p>

                <p>
                  Status: {subscription.status}
                </p>

                <p className="subscription-cancel-row">
                  {cancellation ? (
                    <a
                      className={
                        cancellation.kind === 'official'
                          ? 'subscription-cancel'
                          : 'subscription-cancel subscription-cancel--search'
                      }
                      href={cancellation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={
                        cancellation.kind === 'official'
                          ? 'Opens this merchant’s own cancellation page'
                          : 'No official link on file — opens a web search'
                      }
                    >
                      {cancellation.kind === 'official'
                        ? 'Cancel subscription ↗'
                        : 'Find how to cancel ↗'}
                    </a>
                  ) : (
                    <span className="subscription-cancel-fallback">
                      No cancellation link available
                    </span>
                  )}
                </p>
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
                    if (
                      !window.confirm(
                        `Delete "${subscription.name}"? This cannot be undone.`
                      )
                    ) {
                      return
                    }

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
                  {deleting === subscription.id
                    ? 'Deleting…'
                    : 'Delete'}
                </button>
              </div>
            </Card>
            )
          })}
        </section>
      )}
    </AppShell>
  )
}

export default SubscriptionsPage
