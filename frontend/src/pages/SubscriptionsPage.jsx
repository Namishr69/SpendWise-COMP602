import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import { useSubscriptions } from '../context/subscriptionsContext'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { sourceLabel } from '../utils/subscriptionSource.js'
import { getCancellationLink } from '../utils/cancellationLinks.js'
import { buildSubscriptionsCsv } from '../utils/subscriptionsCsv.js'
import { downloadCsv } from '../utils/downloadFile.js'

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
  const [sortBy, setSortBy] = useState('recent')

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

  function handleExport() {
    if (subscriptions.length === 0) {
      window.alert('No subscription data available to export.')
      return
    }

    downloadCsv(
      buildSubscriptionsCsv(subscriptions),
      'spendwise-subscriptions.csv',
    )
  }

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

        <div className="subscriptions-header__actions">
          <button
            className="subscriptions-export"
            type="button"
            onClick={handleExport}
          >
            Export CSV
          </button>

          <Link
            className="subscriptions-add"
            to="/subscriptions/new"
          >
            + Add subscription
          </Link>
        </div>
      </header>

      {subscriptions.length === 0 ? (
        <p>No subscriptions yet.</p>
      ) : (
        <>
          <div className="subscriptions-sort">
            <label
              className="subscriptions-sort__label"
              htmlFor="subscriptions-sort"
            >
              Sort by
            </label>
            <select
              id="subscriptions-sort"
              className="subscriptions-sort__select"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="recent">Newest</option>
              <option value="renewal">Renewal date</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>

          <section className="subscriptions-grid">
          {sortedSubscriptions.map((subscription) => {
            const cancelUrl = getCancellationLink(subscription.name)

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
                  {cancelUrl ? (
                    <a
                      className="subscription-cancel"
                      href={cancelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Cancel subscription ↗
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
        </>
      )}
    </AppShell>
  )
}

export default SubscriptionsPage
