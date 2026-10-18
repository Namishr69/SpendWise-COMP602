import { useState } from 'react'
import { Link } from 'react-router-dom'

import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import { useSubscriptions } from '../context/subscriptionsContext'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { useTranslations } from '../hooks/useTranslations.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { buildSubscriptionsCsv } from '../utils/subscriptionsCsv.js'
import { downloadCsv } from '../utils/downloadFile.js'
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
  'Paused',
  'Select',
  'Select all',
  'selected',
  'Pause',
  'Unpause',
  'Cancel',
  'Applying...',
  'Bulk action completed successfully.',
  'Some subscriptions could not be updated.',
  'Pause selected subscriptions?',
  'Unpause selected subscriptions?',
  'Cancel selected subscriptions?',
  'Delete selected subscriptions? This cannot be undone.',
  'Cannot delete subscription',
  'This subscription must be cancelled before it can be deleted.',
  'Cannot delete selected subscriptions',
  'All selected subscriptions must be cancelled before they can be deleted.',
  'Cannot pause selected subscriptions',
  'Only active subscriptions can be paused.',
  'Cannot unpause selected subscriptions',
  'Only paused subscriptions can be unpaused.',
  'Cannot cancel selected subscriptions',
  'Only active or paused subscriptions can be cancelled.',
  'from',
  'Cancel subscription ↗',
  'Find how to cancel ↗',
  'No cancellation link available',
]

// Effective dates are plain YYYY-MM-DD, so read them as local dates.
function formatDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`)

  if (Number.isNaN(date.getTime())) return isoDate

  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SubscriptionsPage() {
  const {
    subscriptions,
    loading,
    error,
    updateSubscription,
    deleteSubscription,
  } = useSubscriptions()

  const [deleting, setDeleting] = useState(null)
  const [sortBy, setSortBy] = useState('recent')

  const [
    selectedSubscriptions,
    setSelectedSubscriptions,
  ] = useState([])

  const [
    bulkActionLoading,
    setBulkActionLoading,
  ] = useState(false)

  const [
    bulkMessage,
    setBulkMessage,
  ] = useState('')

  const [
    bulkError,
    setBulkError,
  ] = useState('')

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
    pausedText,
    selectText,
    selectAllText,
    selectedText,
    pauseText,
    unpauseText,
    cancelText,
    applyingText,
    bulkSuccessText,
    bulkErrorText,
    pauseConfirmationText,
    unpauseConfirmationText,
    cancelConfirmationText,
    bulkDeleteConfirmationText,
    cannotDeleteText,
    mustCancelBeforeDeleteText,
    cannotBulkDeleteText,
    allMustCancelBeforeDeleteText,
    cannotPauseText,
    onlyActiveCanPauseText,
    cannotUnpauseText,
    onlyPausedCanUnpauseText,
    cannotCancelText,
    onlyActivePausedCanCancelText,
    fromText,
    cancelSubscriptionText,
    findHowToCancelText,
    noCancellationLinkText,
  ] = useTranslations(SUBSCRIPTIONS_TEXT)

  const showMoney = (amount) =>
    formatCurrency(
      (Number(amount) || 0) * rate,
      preferredCurrency,
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

      case 'paused':
        return pausedText

      case 'cancelled':
      case 'canceled':
        return cancelledText

      default:
        return subscriptionStatus || ''
    }
  }

  function getStatusClass(subscriptionStatus) {
    switch (subscriptionStatus?.toLowerCase()) {
      case 'active':
        return 'subscription-status--active'

      case 'paused':
        return 'subscription-status--paused'

      case 'cancelled':
      case 'canceled':
        return 'subscription-status--cancelled'

      default:
        return ''
    }
  }

  function getSelectedSubscriptionObjects() {
    return subscriptions.filter((subscription) =>
      selectedSubscriptions.includes(subscription.id),
    )
  }

  function handleSubscriptionSelection(subscriptionId) {
    setBulkMessage('')
    setBulkError('')

    setSelectedSubscriptions((currentSelection) => {
      if (currentSelection.includes(subscriptionId)) {
        return currentSelection.filter(
          (id) => id !== subscriptionId,
        )
      }

      return [
        ...currentSelection,
        subscriptionId,
      ]
    })
  }

  function handleSelectAll() {
    setBulkMessage('')
    setBulkError('')

    if (
      selectedSubscriptions.length ===
      subscriptions.length
    ) {
      setSelectedSubscriptions([])
      return
    }

    setSelectedSubscriptions(
      subscriptions.map(
        (subscription) => subscription.id,
      ),
    )
  }

  function validateBulkStatusAction(status) {
    const selected =
      getSelectedSubscriptionObjects()

    if (status === 'Paused') {
      const invalid = selected.some(
        (subscription) =>
          subscription.status?.toLowerCase() !==
          'active',
      )

      if (invalid) {
        window.alert(
          `${cannotPauseText}\n\n${onlyActiveCanPauseText}`,
        )
        return false
      }
    }

    if (status === 'Active') {
      const invalid = selected.some(
        (subscription) =>
          subscription.status?.toLowerCase() !==
          'paused',
      )

      if (invalid) {
        window.alert(
          `${cannotUnpauseText}\n\n${onlyPausedCanUnpauseText}`,
        )
        return false
      }
    }

    if (status === 'Cancelled') {
      const invalid = selected.some(
        (subscription) => {
          const currentStatus =
            subscription.status?.toLowerCase()

          return (
            currentStatus !== 'active' &&
            currentStatus !== 'paused'
          )
        },
      )

      if (invalid) {
        window.alert(
          `${cannotCancelText}\n\n${onlyActivePausedCanCancelText}`,
        )
        return false
      }
    }

    return true
  }

  async function handleBulkStatus(
    status,
    confirmationMessage,
  ) {
    if (selectedSubscriptions.length === 0) {
      return
    }

    if (!validateBulkStatusAction(status)) {
      return
    }

    if (!window.confirm(confirmationMessage)) {
      return
    }

    setBulkActionLoading(true)
    setBulkMessage('')
    setBulkError('')

    const selectedIds = [
      ...selectedSubscriptions,
    ]

    try {
      const results =
        await Promise.allSettled(
          selectedIds.map(
            (subscriptionId) =>
              updateSubscription(
                subscriptionId,
                {
                  status,
                },
              ),
          ),
        )

      const failedIds = results
        .map((result, index) => ({
          result,
          id: selectedIds[index],
        }))
        .filter(
          ({ result }) =>
            result.status === 'rejected',
        )
        .map(({ id }) => id)

      if (failedIds.length === 0) {
        setSelectedSubscriptions([])
        setBulkMessage(bulkSuccessText)
      } else {
        setSelectedSubscriptions(failedIds)
        setBulkError(bulkErrorText)
      }
    } finally {
      setBulkActionLoading(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedSubscriptions.length === 0) {
      return
    }

    const selected =
      getSelectedSubscriptionObjects()

    const containsNonCancelled =
      selected.some(
        (subscription) =>
          subscription.status?.toLowerCase() !==
            'cancelled' &&
          subscription.status?.toLowerCase() !==
            'canceled',
      )

    if (containsNonCancelled) {
      window.alert(
        `${cannotBulkDeleteText}\n\n${allMustCancelBeforeDeleteText}`,
      )
      return
    }

    if (
      !window.confirm(
        bulkDeleteConfirmationText,
      )
    ) {
      return
    }

    setBulkActionLoading(true)
    setBulkMessage('')
    setBulkError('')

    const selectedIds = [
      ...selectedSubscriptions,
    ]

    try {
      const results =
        await Promise.allSettled(
          selectedIds.map(
            (subscriptionId) =>
              deleteSubscription(
                subscriptionId,
              ),
          ),
        )

      const failedIds = results
        .map((result, index) => ({
          result,
          id: selectedIds[index],
        }))
        .filter(
          ({ result }) =>
            result.status === 'rejected',
        )
        .map(({ id }) => id)

      if (failedIds.length === 0) {
        setSelectedSubscriptions([])
        setBulkMessage(bulkSuccessText)
      } else {
        setSelectedSubscriptions(failedIds)
        setBulkError(bulkErrorText)
      }
    } finally {
      setBulkActionLoading(false)
    }
  }

  async function handleIndividualDelete(
    subscription,
  ) {
    const currentStatus =
      subscription.status?.toLowerCase()

    if (
      currentStatus !== 'cancelled' &&
      currentStatus !== 'canceled'
    ) {
      window.alert(
        `${cannotDeleteText}\n\n${mustCancelBeforeDeleteText}`,
      )
      return
    }

    if (
      !window.confirm(
        `"${subscription.name}"\n\n${deleteConfirmationText}`,
      )
    ) {
      return
    }

    setDeleting(subscription.id)
    setBulkMessage('')
    setBulkError('')

    try {
      await deleteSubscription(
        subscription.id,
      )

      setSelectedSubscriptions(
        (currentSelection) =>
          currentSelection.filter(
            (id) =>
              id !== subscription.id,
          ),
      )
    } catch {
      window.alert(deleteFailedText)
    } finally {
      setDeleting(null)
    }
  }

  const allSelected =
    subscriptions.length > 0 &&
    selectedSubscriptions.length ===
      subscriptions.length

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

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (sortBy === 'source-bank') {
      return sub.source === 'anz-detected'
    }
    if (sortBy === 'source-email') {
      return sub.source === 'gmail-detected'
    }
    if (sortBy === 'source-manual') {
      return !sub.source || sub.source === 'manual'
    }
    return true
  })

  const sortedSubscriptions =
    sortBy === 'recent' ||
    sortBy === 'source-bank' ||
    sortBy === 'source-email' ||
    sortBy === 'source-manual'
      ? filteredSubscriptions
      : [...filteredSubscriptions].sort((a, b) => {
          if (sortBy === 'name') {
            return (a.name || '').localeCompare(b.name || '')
          }

          if (sortBy === 'source') {
            const labelA = sourceLabel(a.source) || ''
            const labelB = sourceLabel(b.source) || ''
            const sourceComp = labelA.localeCompare(labelB)
            if (sourceComp !== 0) return sourceComp
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

          <h1>{subscriptionsText}</h1>

          <p>{descriptionText}</p>
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
            {addSubscriptionText}
          </Link>
        </div>
      </header>

      {subscriptions.length === 0 ? (
        <p>{noSubscriptionsText}</p>
      ) : (
        <>
          <div className="subscriptions-bulk-bar">
            <div className="subscriptions-bulk-selection">
              <label className="subscriptions-select-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={
                    bulkActionLoading
                  }
                  onChange={
                    handleSelectAll
                  }
                />

                <span>
                  {selectAllText}
                </span>
              </label>

              <span className="subscriptions-selected-count">
                <strong>
                  {
                    selectedSubscriptions.length
                  }
                </strong>{' '}
                {selectedText}
              </span>
            </div>

            <div className="subscriptions-bulk-actions">
              <button
                type="button"
                disabled={
                  selectedSubscriptions.length ===
                    0 ||
                  bulkActionLoading
                }
                onClick={() =>
                  handleBulkStatus(
                    'Paused',
                    pauseConfirmationText,
                  )
                }
              >
                {bulkActionLoading
                  ? applyingText
                  : pauseText}
              </button>

              <button
                type="button"
                disabled={
                  selectedSubscriptions.length ===
                    0 ||
                  bulkActionLoading
                }
                onClick={() =>
                  handleBulkStatus(
                    'Active',
                    unpauseConfirmationText,
                  )
                }
              >
                {unpauseText}
              </button>

              <button
                type="button"
                disabled={
                  selectedSubscriptions.length ===
                    0 ||
                  bulkActionLoading
                }
                onClick={() =>
                  handleBulkStatus(
                    'Cancelled',
                    cancelConfirmationText,
                  )
                }
              >
                {cancelText}
              </button>

              <button
                type="button"
                className="subscriptions-bulk-delete"
                disabled={
                  selectedSubscriptions.length ===
                    0 ||
                  bulkActionLoading
                }
                onClick={
                  handleBulkDelete
                }
              >
                {deleteText}
              </button>
            </div>
          </div>

          {bulkMessage && (
            <p className="subscriptions-bulk-message subscriptions-bulk-message--success">
              {bulkMessage}
            </p>
          )}

          {bulkError && (
            <p className="subscriptions-bulk-message subscriptions-bulk-message--error">
              {bulkError}
            </p>
          )}

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
              <option value="source-bank">From bank</option>
              <option value="source-email">From email</option>
              <option value="source-manual">Manually added</option>
              <option value="source">Sort by source</option>
            </select>
          </div>

          <section className="subscriptions-grid">
            {sortedSubscriptions.map((subscription) => {
              const cancellation = resolveCancellation(subscription.name)

              return (
                <Card
                  key={subscription.id}
                  className="subscription-card"
                >
                  <div>
                    <label className="subscription-select">
                      <input
                        type="checkbox"
                        checked={selectedSubscriptions.includes(
                          subscription.id,
                        )}
                        disabled={
                          bulkActionLoading
                        }
                        onChange={() =>
                          handleSubscriptionSelection(
                            subscription.id,
                          )
                        }
                      />

                      <span>
                        {selectText}
                      </span>
                    </label>

                    <div className="subscription-card__heading">
                      <h2>
                        {subscription.name}
                      </h2>

                      {sourceLabel(subscription.source) && (
                        <span className="subscription-source">
                          {sourceLabel(subscription.source)}
                        </span>
                      )}

                      <span
                        className={`subscription-status ${getStatusClass(
                          subscription.status,
                        )}`}
                      >
                        {translateStatus(
                          subscription.status,
                        )}
                      </span>
                    </div>

                    <p>
                      {showMoney(
                        subscription.amount,
                      )}{' '}
                      /{' '}
                      {translateBillingCycle(
                        subscription.billingCycle,
                      )}
                    </p>

                    {subscription.upcomingPriceChange && (
                      <p
                        className={`subscription-card__price-change subscription-card__price-change--${
                          subscription.upcomingPriceChange.newAmount >
                          subscription.amount
                            ? 'up'
                            : 'down'
                        }`}
                      >
                        →{' '}
                        {showMoney(
                          subscription.upcomingPriceChange.newAmount,
                        )}{' '}
                        {fromText}{' '}
                        {formatDate(
                          subscription.upcomingPriceChange.effectiveDate,
                        )}
                      </p>
                    )}

                    <p>
                      {nextPaymentText}{' '}
                      {
                        subscription.nextPaymentDate
                      }
                    </p>

                    <p>
                      {statusText}{' '}
                      <strong>
                        {translateStatus(
                          subscription.status,
                        )}
                      </strong>
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
                            ? cancelSubscriptionText || 'Cancel subscription ↗'
                            : findHowToCancelText || 'Find how to cancel ↗'}
                        </a>
                      ) : (
                        <span className="subscription-cancel-fallback">
                          {noCancellationLinkText ||
                            'No cancellation link available'}
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
                      disabled={
                        deleting ===
                          subscription.id ||
                        bulkActionLoading
                      }
                      onClick={() =>
                        handleIndividualDelete(
                          subscription,
                        )
                      }
                    >
                      {deleting ===
                      subscription.id
                        ? deletingText
                        : deleteText}
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
