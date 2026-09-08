import { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppShell from '../layouts/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { AuthContext } from '../context/AuthProvider'
import { CurrencyContext } from '../context/CurrencyProvider'
import { createTransaction } from '../api/transactionApi'
import './AddTransactionPage.css'

function AddTransactionPage() {
  const navigate = useNavigate()

  const { currentUser } = useContext(AuthContext)
  const { preferredCurrency } = useContext(CurrencyContext)

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [errors, setErrors] = useState({})

  function validateForm() {
    const nextErrors = {}
    const numericAmount = Number(amount)

    if (!name.trim()) {
      nextErrors.name =
        'Enter a transaction name.'
    }

    if (
      !amount ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      nextErrors.amount =
        'Enter an amount greater than zero.'
    }

    if (!date) {
      nextErrors.date =
        'Select a transaction date.'
    }

    if (!category.trim()) {
      nextErrors.category =
        'Select a category.'
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
      await createTransaction(currentUser, {
        name: name.trim(),
        amount: Number(amount),
        date,
        category: category.trim(),
        currency: preferredCurrency,
      })

      navigate('/transactions')
    } catch (err) {
      setErrors({
        form: err.message,
      })
    }
  }

  return (
    <AppShell
      activeNav="Transactions"
      hideTopbarTitle
    >
      <div className="add-transaction-page">
        <Link to="/transactions">
          ← Cancel and return
        </Link>

        <Card className="add-transaction-form-card">
          <h1>Add transaction</h1>

          <p>
            Add a transaction manually to track
            your spending.
          </p>

          <p>
            Currency: <strong>{preferredCurrency}</strong>
          </p>

          {errors.form && (
            <p className="add-transaction-form-error">
              {errors.form}
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            noValidate
          >
            <Input
              id="transaction-name"
              label="Transaction name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              error={errors.name}
            />

            <Input
              id="transaction-amount"
              label={`Amount (${preferredCurrency})`}
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              error={errors.amount}
            />

            <Input
              id="transaction-date"
              label="Transaction date"
              type="date"
              value={date}
              onChange={(event) =>
                setDate(event.target.value)
              }
              error={errors.date}
            />

            <div className="sw-field">
              <label
                className="sw-field__label"
                htmlFor="transaction-category"
              >
                Category
              </label>

              <select
                id="transaction-category"
                className="sw-field__input"
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
              >
                <option value="">
                  Select a category
                </option>

                <option value="Food">
                  Food
                </option>

                <option value="Transport">
                  Transport
                </option>

                <option value="Shopping">
                  Shopping
                </option>

                <option value="Bills">
                  Bills
                </option>

                <option value="Entertainment">
                  Entertainment
                </option>

                <option value="Other">
                  Other
                </option>
              </select>

              {errors.category && (
                <span className="sw-field__error">
                  {errors.category}
                </span>
              )}
            </div>

            <div className="add-transaction-form-actions">
              <Link to="/transactions">
                Cancel
              </Link>

              <Button type="submit">
                Add transaction
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  )
}

export default AddTransactionPage