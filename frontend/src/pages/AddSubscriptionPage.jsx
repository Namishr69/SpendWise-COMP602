import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../layouts/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useSubscriptions } from '../context/subscriptionsContext'
import './AddSubscriptionPage.css'

function AddSubscriptionPage() {
  const navigate = useNavigate()
  const { createSubscription } = useSubscriptions()

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [billingCycle, setBillingCycle] = useState('Monthly')
  const [nextPaymentDate, setNextPaymentDate] = useState('')
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
      const created = await createSubscription({
        name: name.trim(),
        amount: Number(amount),
        billingCycle,
        nextPaymentDate: nextPaymentDate.trim(),
      })
      navigate(`/subscriptions/${created.id}`)
    } catch (err) {
      setErrors({ form: err.message })
    }
  }

  return (
    <AppShell activeNav="Subscriptions">
      <div className="add-page">
        <Link to="/subscriptions">← Cancel and return</Link>

        <Card className="add-form-card">
          <h1>Add subscription</h1>
          <p>Track a new recurring payment.</p>

          {errors.form && <p className="add-form-error">{errors.form}</p>}

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

            <div className="sw-field">
              <label className="sw-field__label" htmlFor="subscription-cycle">
                Billing cycle
              </label>
              <select
                id="subscription-cycle"
                className="sw-field__input"
                value={billingCycle}
                onChange={(event) => setBillingCycle(event.target.value)}
              >
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
                <option value="Weekly">Weekly</option>
                <option value="Quarterly">Quarterly</option>
              </select>
            </div>

            <Input
              id="subscription-next-date"
              label="Next payment date"
              type="date"
              value={nextPaymentDate}
              onChange={(event) => setNextPaymentDate(event.target.value)}
            />

            <div className="add-form-actions">
              <Link to="/subscriptions">Cancel</Link>
              <Button type="submit">Add subscription</Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  )
}

export default AddSubscriptionPage
