import { useState } from 'react'
import { Link } from 'react-router-dom'

import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { useSubscriptions } from '../context/subscriptionsContext'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { formatCurrency } from '../utils/formatCurrency.js'

import './SubscriptionsPage.css'

function SubscriptionsPage() {
  const {
    subscriptions,
    loading,
    error,
    deleteSubscription,
  } = useSubscriptions()

  const [deleting, setDeleting] = useState(null)
  const [sortBy, setSortBy] = useState('recent')

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

  const sortedSubscriptions =
    sortBy === 'recent'
      ? subscriptions
      : [...subscriptions].sort((a, b) => {
          if (sortBy === 'name') {
            return (a.name || '').localeCompare(b.name || '')
          }

          // sortBy === 'renewal'
          const dateA = a.nextPaymentDate
            ? new Date(a.nextPaymentDate)
            : null
          const dateB = b.nextPaymentDate
            ? new Date(b.nextPaymentDate)
            : null

          if (dateA && dateB) return dateA - dateB
          if (dateA) return -1
          if (dateB) return 1
          return 0
        })

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
        <>
          <div className="subscriptions-sort">
            <span className="subscriptions-sort__label">
              Sort by
            </span>
            <div
              className="subscriptions-sort__toggle"
              role="group"
              aria-label="Sort subscriptions"
            >
              <button
                type="button"
                className={sortBy === 'recent' ? 'is-active' : ''}
                aria-pressed={sortBy === 'recent'}
                onClick={() => setSortBy('recent')}
              >
                Newest
              </button>
              <button
                type="button"
                className={sortBy === 'renewal' ? 'is-active' : ''}
                aria-pressed={sortBy === 'renewal'}
                onClick={() => setSortBy('renewal')}
              >
                Renewal date
              </button>
              <button
                type="button"
                className={sortBy === 'name' ? 'is-active' : ''}
                aria-pressed={sortBy === 'name'}
                onClick={() => setSortBy('name')}
              >
                Name (A–Z)
              </button>
            </div>
          </div>

          <section className="subscriptions-grid">
          {sortedSubscriptions.map((subscription) => (
            <Card
              key={subscription.id}
              className="subscription-card"
            >
              <div>
                <h2>{subscription.name}</h2>

                <p>
                  {showMoney(subscription.amount)} /{' '}
                  {subscription.billingCycle.toLowerCase()}
                </p>

                <p>
                  Next payment: {subscription.nextPaymentDate}
                </p>

                <p>
                  Status: {subscription.status}
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
          ))}
          </section>
        </>
      )}
    </AppShell>
  )
}

export default SubscriptionsPage
