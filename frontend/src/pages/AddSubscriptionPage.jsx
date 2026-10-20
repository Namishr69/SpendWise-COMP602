import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import AppShell from '../layouts/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useSubscriptions } from '../context/subscriptionsContext'
import { useTranslations } from '../hooks/useTranslations.js'

import './AddSubscriptionPage.css'

const ADD_SUBSCRIPTION_TEXT = [
  'Cancel and return',
  'Add subscription',
  'Track a new recurring payment.',
  'Subscription name',
  'Payment amount',
  'Billing cycle',
  'Monthly',
  'Yearly',
  'Weekly',
  'Quarterly',
  'Subscription date',
  'Next payment date',
  'Cancel',
  'Enter a subscription name.',
  'Enter an amount greater than zero.',
  'This is a free trial',
  'Trial end date',
  'Enter the date the free trial ends.',
]

function localToday() {
  const now = new Date()
  const month = String(
    now.getMonth() + 1,
  ).padStart(2, '0')

  const day = String(
    now.getDate(),
  ).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}

function AddSubscriptionPage() {
  const navigate = useNavigate()

  const { createSubscription } =
    useSubscriptions()

  const [
    cancelAndReturnText,
    addSubscriptionText,
    descriptionText,
    subscriptionNameText,
    paymentAmountText,
    billingCycleText,
    monthlyText,
    yearlyText,
    weeklyText,
    quarterlyText,
    subscriptionDateText,
    nextPaymentDateText,
    cancelText,
    nameErrorText,
    amountErrorText,
    freeTrialText,
    trialEndDateText,
    trialEndErrorText,
  ] = useTranslations(ADD_SUBSCRIPTION_TEXT)

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')

  const [billingCycle, setBillingCycle] =
    useState('Monthly')

  const [
    subscriptionDate,
    setSubscriptionDate,
  ] = useState(localToday())

  const [
    nextPaymentDate,
    setNextPaymentDate,
  ] = useState('')

  // A free trial gets an alert shortly before it ends.
  const [isTrial, setIsTrial] =
    useState(false)

  const [
    trialEndDate,
    setTrialEndDate,
  ] = useState('')

  const [errors, setErrors] = useState({})

  function validateForm() {
    const nextErrors = {}
    const numericAmount = Number(amount)

    if (!name.trim()) {
      nextErrors.name = nameErrorText
    }

    if (
      !amount ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      nextErrors.amount = amountErrorText
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
      const created =
        await createSubscription({
          name: name.trim(),
          amount: Number(amount),
          billingCycle,
          subscriptionDate:
            subscriptionDate.trim(),
          nextPaymentDate:
            nextPaymentDate.trim(),
          isTrial,
          trialEndDate: isTrial
            ? trialEndDate
            : '',
        })

      navigate(
        `/subscriptions/${created.id}`,
      )
    } catch (err) {
      setErrors({
        form: err.message,
      })
    }
  }

  return (
    <AppShell activeNav="Subscriptions">
      <div className="add-page">
        <Link to="/subscriptions">
          ← {cancelAndReturnText}
        </Link>

        <Card className="add-form-card">
          <h1>{addSubscriptionText}</h1>

          <p>{descriptionText}</p>

          {errors.form && (
            <p className="add-form-error">
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
                setName(event.target.value)
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
                setAmount(event.target.value)
              }
              error={errors.amount}
            />

            <div className="sw-field">
              <label
                className="sw-field__label"
                htmlFor="subscription-cycle"
              >
                {billingCycleText}
              </label>

              <select
                id="subscription-cycle"
                className="sw-field__input"
                value={billingCycle}
                onChange={(event) =>
                  setBillingCycle(
                    event.target.value,
                  )
                }
              >
                <option value="Monthly">
                  {monthlyText}
                </option>

                <option value="Yearly">
                  {yearlyText}
                </option>

                <option value="Weekly">
                  {weeklyText}
                </option>

                <option value="Quarterly">
                  {quarterlyText}
                </option>
              </select>
            </div>

            <Input
              id="subscription-date"
              label={subscriptionDateText}
              type="date"
              value={subscriptionDate}
              onChange={(event) =>
                setSubscriptionDate(
                  event.target.value,
                )
              }
            />

            <Input
              id="subscription-next-date"
              label={nextPaymentDateText}
              type="date"
              value={nextPaymentDate}
              onChange={(event) =>
                setNextPaymentDate(
                  event.target.value,
                )
              }
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

            <div className="add-form-actions">
              <Link to="/subscriptions">
                {cancelText}
              </Link>

              <Button type="submit">
                {addSubscriptionText}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  )
}

export default AddSubscriptionPage