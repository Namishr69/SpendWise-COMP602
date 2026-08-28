import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import AppShell from '../layouts/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useSubscriptions } from '../context/subscriptionsContext'
import './EditSubscriptionPage.css'

function EditSubscriptionPage() {
  const { subscriptionId } = useParams()
  const navigate = useNavigate()
  const { loading, getSubscription, updateSubscription } = useSubscriptions()
  const subscription = getSubscription(subscriptionId)

  if (loading) {
    return (
      <AppShell activeNav="Subscriptions">
        <p>Loading subscription…</p>
      </AppShell>
    )
  }

  if (!subscription) {
    return <Navigate to="/subscriptions" replace />
  }

  return (
    <EditSubscriptionForm
      key={subscription.id}
      subscription={subscription}
      updateSubscription={updateSubscription}
      onSaved={() => navigate(`/subscriptions/${subscription.id}`)}
    />
  )
}

function EditSubscriptionForm({ subscription, updateSubscription, onSaved }) {
  const [name, setName] = useState(subscription.name)
  const [amount, setAmount] = useState(String(subscription.amount))
  const [errors, setErrors] = useState({})

  function validateForm() {
    const nextErrors = {}
    const numericAmount = Number(amount)

    if (!name.trim()) {
      nextErrors.name = 'Enter a subscription name.'
    }

    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      nextErrors.amount = 'Enter an amount greater than zero.'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      await updateSubscription(subscription.id, {
        name: name.trim(),
        amount: Number(amount),
      })
      onSaved()
    } catch (err) {
      setErrors({ form: err.message })
    }
  }

  return (
    <AppShell activeNav="Subscriptions">
      <div className="edit-page">
        <Link to={`/subscriptions/${subscription.id}`}>
          ← Cancel and return
        </Link>

        <Card className="edit-form-card">
          <h1>Edit subscription</h1>
          <p>Update the subscription name or payment amount.</p>

          {errors.form && <p className="edit-form-error">{errors.form}</p>}

          <form onSubmit={handleSubmit} noValidate>
            <Input
              id="subscription-name"
              label="Subscription name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={errors.name}
            />

            <Input
              id="subscription-amount"
              label="Payment amount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              error={errors.amount}
            />

            <div className="edit-form-actions">
              <Link to={`/subscriptions/${subscription.id}`}>Cancel</Link>
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  )
}

export default EditSubscriptionPage
