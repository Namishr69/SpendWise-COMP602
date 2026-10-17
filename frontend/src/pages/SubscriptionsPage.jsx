import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import { useSubscriptions } from '../context/subscriptionsContext'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { useTranslations } from '../hooks/useTranslations.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { sourceLabel } from '../utils/subscriptionSource.js'
import { resolveCancellation } from '../utils/cancellationLinks.js'

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

  const [deleting, setDeleting] =
    useState(null)

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
        <section className="subscriptions-grid">
          {subscriptions.map(
            (subscription) => (
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
            ),
          )}
        </section>
      )}
    </AppShell>
  )
}

export default SubscriptionsPage