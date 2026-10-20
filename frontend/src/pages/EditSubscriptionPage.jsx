import { useState } from 'react'
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom'

import AppShell from '../layouts/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useSubscriptions } from '../context/subscriptionsContext'
import { useTranslations } from '../hooks/useTranslations.js'

import './EditSubscriptionPage.css'

const EDIT_SUBSCRIPTION_PAGE_TEXT = [
  'Loading subscription...',
]

const EDIT_SUBSCRIPTION_FORM_TEXT = [
  'Cancel and return',
  'Edit subscription',
  'Update the subscription name or payment amount.',
  'Subscription name',
  'Payment amount',
  'Cancel',
  'Save changes',
  'Enter a subscription name.',
  'Enter an amount greater than zero.',
  'This is a free trial',
  'Trial end date',
  'Enter the date the free trial ends.',
]

function EditSubscriptionPage() {
  const { subscriptionId } = useParams()
  const navigate = useNavigate()

  const {
    loading,
    getSubscription,
    updateSubscription,
  } = useSubscriptions()

  const [
    loadingSubscriptionText,
  ] = useTranslations(
    EDIT_SUBSCRIPTION_PAGE_TEXT,
  )

  const subscription =
    getSubscription(subscriptionId)

  if (loading) {
    return (
      <AppShell activeNav="Subscriptions">
        <p>
          {loadingSubscriptionText}
        </p>
      </AppShell>
    )
  }

  if (!subscription) {
    return (
      <Navigate
        to="/subscriptions"
        replace
      />
    )
  }

  return (
    <EditSubscriptionForm
      key={subscription.id}
      subscription={subscription}
      updateSubscription={
        updateSubscription
      }
      onSaved={() =>
        navigate(
          `/subscriptions/${subscription.id}`,
        )
      }
    />
  )
}

function EditSubscriptionForm({
  subscription,
  updateSubscription,
  onSaved,
}) {
  const [
    cancelAndReturnText,
    editSubscriptionText,
    descriptionText,
    subscriptionNameText,
    paymentAmountText,
    cancelText,
    saveChangesText,
    nameErrorText,
    amountErrorText,
    freeTrialText,
    trialEndDateText,
    trialEndErrorText,
  ] = useTranslations(
    EDIT_SUBSCRIPTION_FORM_TEXT,
  )

  const [name, setName] = useState(
    subscription.name,
  )

  const [amount, setAmount] = useState(
    String(subscription.amount),
  )

  // A free trial gets an alert shortly before it ends.
  const [isTrial, setIsTrial] =
    useState(subscription.isTrial === true)

  const [
    trialEndDate,
    setTrialEndDate,
  ] = useState(
    subscription.trialEndDate || '',
  )

  const [errors, setErrors] =
    useState({})

  function validateForm() {
    const nextErrors = {}
    const numericAmount = Number(amount)

    if (!name.trim()) {
      nextErrors.name =
        nameErrorText
    }

    if (
      !amount ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      nextErrors.amount =
        amountErrorText
    }

    if (isTrial && !trialEndDate) {
      nextErrors.trialEndDate =
        trialEndErrorText
    }

    setErrors(nextErrors)

    return (
      Object.keys(nextErrors).length === 0
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await updateSubscription(
        subscription.id,
        {
          name: name.trim(),
          amount: Number(amount),
          isTrial,
          trialEndDate: isTrial
            ? trialEndDate
            : '',
        },
      )

      onSaved()
    } catch (err) {
      setErrors({
        form: err.message,
      })
    }
  }

  return (
    <AppShell activeNav="Subscriptions">
      <div className="edit-page">
        <Link
          to={`/subscriptions/${subscription.id}`}
        >
          ← {cancelAndReturnText}
        </Link>

        <Card className="edit-form-card">
          <h1>
            {editSubscriptionText}
          </h1>

          <p>{descriptionText}</p>

          {errors.form && (
            <p className="edit-form-error">
              {errors.form}
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
          >
            <Input
              id="subscription-name"
              label={subscriptionNameText}
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              error={errors.name}
            />

            <Input
              id="subscription-amount"
              label={paymentAmountText}
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value,
                )
              }
              error={errors.amount}
            />

            <label className="sw-field__check">
              <input
                type="checkbox"
                checked={isTrial}
                onChange={(event) =>
                  setIsTrial(
                    event.target.checked,
                  )
                }
              />

              {freeTrialText}
            </label>

            {isTrial && (
              <Input
                id="subscription-trial-end"
                label={trialEndDateText}
                type="date"
                value={trialEndDate}
                onChange={(event) =>
                  setTrialEndDate(
                    event.target.value,
                  )
                }
                error={errors.trialEndDate}
              />
            )}

            <div className="edit-form-actions">
              <Link
                to={`/subscriptions/${subscription.id}`}
              >
                {cancelText}
              </Link>

              <Button type="submit">
                {saveChangesText}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  )
}

export default EditSubscriptionPage