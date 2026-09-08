import { useContext, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppShell from '../layouts/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { AuthContext } from '../context/AuthProvider'
import {
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from '../api/transactionApi'
import './EditSubscriptionPage.css'

function EditTransactionPage() {
  const { transactionId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useContext(AuthContext)

  const [transaction, setTransaction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    async function loadTransaction() {
      try {
        const data = await getTransaction(
          currentUser,
          transactionId
        )

        setTransaction(data)
      } catch (err) {
        setLoadError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (currentUser) {
      loadTransaction()
    }
  }, [currentUser, transactionId])

  if (loading) {
    return (
      <AppShell
        activeNav="Transactions"
        hideTopbarTitle
      >
        <p>Loading transaction...</p>
      </AppShell>
    )
  }

  if (loadError || !transaction) {
    return (
      <AppShell
        activeNav="Transactions"
        hideTopbarTitle
      >
        <p>
          Could not load transaction:{' '}
          {loadError || 'Transaction not found'}
        </p>

        <Link to="/transactions">
          ← Return to transactions
        </Link>
      </AppShell>
    )
  }

  return (
    <EditTransactionForm
      transaction={transaction}
      currentUser={currentUser}
      onSaved={() => navigate('/transactions')}
      onDeleted={() => navigate('/transactions')}
    />
  )
}

function EditTransactionForm({
  transaction,
  currentUser,
  onSaved,
  onDeleted,
}) {
  const [name, setName] = useState(transaction.name)
  const [amount, setAmount] = useState(
    String(transaction.amount)
  )
  const [date, setDate] = useState(transaction.date)
  const [category, setCategory] = useState(
    transaction.category
  )

  const [errors, setErrors] = useState({})
  const [deleting, setDeleting] = useState(false)

  function validateForm() {
    const nextErrors = {}
    const numericAmount = Number(amount)

    if (!name.trim()) {
      nextErrors.name = 'Enter a transaction name.'
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
      nextErrors.date = 'Select a transaction date.'
    }

    if (!category.trim()) {
      nextErrors.category = 'Select a category.'
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
      await updateTransaction(
        currentUser,
        transaction.id,
        {
          name: name.trim(),
          amount: Number(amount),
          date,
          category,
        }
      )

      onSaved()
    } catch (err) {
      setErrors({
        form: err.message,
      })
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${transaction.name}"?`
    )

    if (!confirmed) {
      return
    }

    try {
      setDeleting(true)

      await deleteTransaction(
        currentUser,
        transaction.id
      )

      onDeleted()
    } catch (err) {
      setErrors({
        form: err.message,
      })

      setDeleting(false)
    }
  }

  return (
    <AppShell
      activeNav="Transactions"
      hideTopbarTitle
    >
      <div className="edit-page">
        <Link to="/transactions">
          ← Cancel and return
        </Link>

        <Card className="edit-form-card">
          <h1>Edit transaction</h1>

          <p>
            Update or delete this manual transaction.
          </p>

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
              label="Amount"
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

            <div className="edit-form-actions">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? 'Deleting...'
                  : 'Delete transaction'}
              </button>

              <Link to="/transactions">
                Cancel
              </Link>

              <Button type="submit">
                Save changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  )
}

export default EditTransactionPage
