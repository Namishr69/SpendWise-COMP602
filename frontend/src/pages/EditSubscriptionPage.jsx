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
  const { getSubscription, updateSubscription } = useSubscriptions()
  const subscription = getSubscription(subscriptionId)

  const [name, setName] = useState(subscription?.name ?? '')
  const [amount, setAmount] = useState(
    subscription ? String(subscription.amount) : '',
  )
  const [errors, setErrors] = useState({})

  if (!subscription) {
    return <Navigate to="/subscriptions" replace />
  }

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

  function handleSubmit(event) {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    updateSubscription(subscription.id, {
      name: name.trim(),
      amount: Number(amount),
    })

    navigate(`/subscriptions/${subscription.id}`)
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
