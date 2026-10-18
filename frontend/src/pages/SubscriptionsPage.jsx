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
  'Cancel subscription ↗',
  'Find how to cancel ↗',
  'No cancellation link available',
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

  // The OAuth callback runs a bank sync server-side, so by the time the user
  // lands here new subscriptions may already exist. Re-read on mount rather
  // than trusting whatever the provider loaded at sign-in.
  useEffect(() => {
    refresh({ silent: true }).catch(() => {})
  }, [refresh])

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
    cancelSubscriptionText,
    findHowToCancelText,
    noCancellationLinkText,
  ] = useTranslations(SUBSCRIPTIONS_TEXT)

  const showMoney = (amount) =>
    formatCurrency(
      (Number(amount) || 0) * rate,
      preferredCurrency,
    )

  function translateBillingCycle(billingCycle) {
    switch (billingCycle?.toLowerCase()) {
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

  function translateStatus(subscriptionStatus) {
    switch (subscriptionStatus?.toLowerCase()) {
      case 'active':
        return activeText

      case 'cancelled':
      case 'canceled':
        return cancelledText

      default:
        return subscriptionStatus || ''
    }
  }

  if (loading) {
    return (
      <AppShell activeNav="Subscriptions">
        <p>{loadingSubscriptionsText}</p>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell activeNav="Subscriptions">
        <p>
          {loadErrorText} {error.message}
        </p>
      </AppShell>
    )
  }

  return (
    <AppShell activeNav="Subscriptions">
      <header className="subscriptions-header">
        <div>
          <p className="subscriptions-eyebrow">SpendWise</p>
          <h1>{subscriptionsText}</h1>
          <p>{descriptionText}</p>
        </div>

        <Link className="subscriptions-add" to="/subscriptions/new">
          {addSubscriptionText}
        </Link>
      </header>

      {subscriptions.length === 0 ? (
        <p>{noSubscriptionsText}</p>
      ) : (
        <section className="subscriptions-grid">
          {subscriptions.map((subscription) => {
            const cancellation = resolveCancellation(subscription.name)

            return (
              <Card key={subscription.id} className="subscription-card">
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
                    {translateBillingCycle(subscription.billingCycle)}
                  </p>

                  <p>
                    {nextPaymentText} {subscription.nextPaymentDate}
                  </p>

                  <p>
                    {statusText} {translateStatus(subscription.status)}
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
                          ? (cancelSubscriptionText || 'Cancel subscription ↗')
                          : (findHowToCancelText || 'Find how to cancel ↗')}
                      </a>
                    ) : (
                      <span className="subscription-cancel-fallback">
                        {noCancellationLinkText || 'No cancellation link available'}
                      </span>
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
                    disabled={deleting === subscription.id}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `"${subscription.name}"\n\n${deleteConfirmationText}`,
                        )
                      ) {
                        return
                      }

                      setDeleting(subscription.id)

                      try {
                        await deleteSubscription(subscription.id)
                      } catch {
                        alert(deleteFailedText)
                      } finally {
                        setDeleting(null)
                      }
                    }}
                  >
                    {deleting === subscription.id ? deletingText : deleteText}
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