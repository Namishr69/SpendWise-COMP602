import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import { useSubscriptions } from '../context/subscriptionsContext'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { useTranslations } from '../hooks/useTranslations.js'
import { formatCurrency } from '../utils/formatCurrency.js'

import './SubscriptionsPage.css'

const SUBSCRIPTIONS_TEXT = [
  'Loading subscriptions...',
  'Could not load subscriptions:',
  'Subscriptions',
  'View and manage your recurring payments.',
  '+ Add subscription',
  'No subscriptions yet.',
  'Next payment:',
  'Status:',
  'View details',
  'Delete this subscription? This cannot be undone.',
  'Failed to delete subscription.',
  'Deleting...',
  'Delete',
  'Monthly',
  'Weekly',
  'Quarterly',
  'Yearly',
  'Active',
  'Cancelled',
]

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

  const {
    preferredCurrency,
    rate,
  } = useCurrencyRate()

  const [
    loadingSubscriptionsText,
    loadErrorText,
    subscriptionsText,
    descriptionText,
    addSubscriptionText,
    noSubscriptionsText,
    nextPaymentText,
    statusText,
    viewDetailsText,
    deleteConfirmationText,
    deleteFailedText,
    deletingText,
    deleteText,
    monthlyText,
    weeklyText,
    quarterlyText,
    yearlyText,
    activeText,
    cancelledText,
  ] = useTranslations(
    SUBSCRIPTIONS_TEXT,
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
        return (
          subscriptionStatus || ''
        )
    }
  }

  if (loading) {
    return (
      <AppShell activeNav="Subscriptions">
        <p>
          {loadingSubscriptionsText}
        </p>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell activeNav="Subscriptions">
        <p>
          {loadErrorText}{' '}
          {error.message}
        </p>
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
          <p className="subscriptions-eyebrow">
            SpendWise
          </p>

          <h1>
            {subscriptionsText}
          </h1>

          <p>
            {descriptionText}
          </p>
        </div>

        <Link
          className="subscriptions-add"
          to="/subscriptions/new"
        >
          {addSubscriptionText}
        </Link>
      </header>

      {subscriptions.length === 0 ? (
        <p>
          {noSubscriptionsText}
        </p>
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
            {sortedSubscriptions.map((subscription) => (
              <Card
                key={subscription.id}
                className="subscription-card"
              >
                <div>
                  <h2>
                    {subscription.name}
                  </h2>

                  <p>
                    {showMoney(
                      subscription.amount,
                    )}{' '}
                    /{' '}
                    {translateBillingCycle(
                      subscription.billingCycle,
                    )}
                  </p>

                  <p>
                    {nextPaymentText}{' '}
                    {
                      subscription.nextPaymentDate
                    }
                  </p>

                  <p>
                    {statusText}{' '}
                    {translateStatus(
                      subscription.status,
                    )}
                  </p>
                </div>

                <div className="subscription-card__actions">
                  <Link
                    className="subscription-link"
                    to={`/subscriptions/${subscription.id}`}
                  >
                    {viewDetailsText}
                  </Link>

                  <button
                    className="subscription-delete"
                    disabled={
                      deleting ===
                      subscription.id
                    }
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `"${subscription.name}"\n\n${deleteConfirmationText}`,
                        )
                      ) {
                        return
                      }

                      setDeleting(
                        subscription.id,
                      )

                      try {
                        await deleteSubscription(
                          subscription.id,
                        )
                      } catch {
                        alert(
                          deleteFailedText,
                        )
                      } finally {
                        setDeleting(null)
                      }
                    }}
                  >
                    {deleting ===
                    subscription.id
                      ? deletingText
                      : deleteText}
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
