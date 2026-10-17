import { useContext, useEffect, useState } from 'react'
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import AppShell from '../layouts/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { AuthContext } from '../context/authContext.js'
import { useTranslations } from '../hooks/useTranslations.js'
import {
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from '../api/transactionApi'

import './EditSubscriptionPage.css'

const EDIT_TRANSACTION_PAGE_TEXT = [
  'Loading transaction...',
  'Could not load transaction:',
  'Transaction not found',
  'Return to transactions',
]

const EDIT_TRANSACTION_FORM_TEXT = [
  'Cancel and return',
  'Edit transaction',
  'Update or delete this manual transaction.',
  'Transaction name',
  'Amount',
  'Transaction date',
  'Category',
  'Select a category',
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Other',
  'Deleting...',
  'Delete transaction',
  'Cancel',
  'Save changes',
  'Enter a transaction name.',
  'Enter an amount greater than zero.',
  'Select a transaction date.',
  'Select a category.',
  'Delete',
]

function EditTransactionPage() {
  const { transactionId } = useParams()
  const navigate = useNavigate()

  const { currentUser } =
    useContext(AuthContext)

  const [
    loadingTransactionText,
    couldNotLoadText,
    transactionNotFoundText,
    returnToTransactionsText,
  ] = useTranslations(
    EDIT_TRANSACTION_PAGE_TEXT,
  )

  const [transaction, setTransaction] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [loadError, setLoadError] =
    useState(null)

  useEffect(() => {
    async function loadTransaction() {
      try {
        const data =
          await getTransaction(
            currentUser,
            transactionId,
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
        <p>
          {loadingTransactionText}
        </p>
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
          {couldNotLoadText}{' '}
          {loadError ||
            transactionNotFoundText}
        </p>

        <Link to="/transactions">
          ← {returnToTransactionsText}
        </Link>
      </AppShell>
    )
  }

  return (
    <EditTransactionForm
      transaction={transaction}
      currentUser={currentUser}
      onSaved={() =>
        navigate('/transactions')
      }
      onDeleted={() =>
        navigate('/transactions')
      }
    />
  )
}

function EditTransactionForm({
  transaction,
  currentUser,
  onSaved,
  onDeleted,
}) {
  const [
    cancelAndReturnText,
    editTransactionText,
    descriptionText,
    transactionNameText,
    amountText,
    transactionDateText,
    categoryText,
    selectCategoryText,
    foodText,
    transportText,
    shoppingText,
    billsText,
    entertainmentText,
    otherText,
    deletingText,
    deleteTransactionText,
    cancelText,
    saveChangesText,
    nameErrorText,
    amountErrorText,
    dateErrorText,
    categoryErrorText,
    deleteText,
  ] = useTranslations(
    EDIT_TRANSACTION_FORM_TEXT,
  )

  const [name, setName] = useState(
    transaction.name,
  )

  const [amount, setAmount] =
    useState(
      String(transaction.amount),
    )

  const [date, setDate] = useState(
    transaction.date,
  )

  const [category, setCategory] =
    useState(transaction.category)

  const [errors, setErrors] =
    useState({})

  const [deleting, setDeleting] =
    useState(false)

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

    if (!date) {
      nextErrors.date =
        dateErrorText
    }

    if (!category.trim()) {
      nextErrors.category =
        categoryErrorText
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
      await updateTransaction(
        currentUser,
        transaction.id,
        {
          name: name.trim(),
          amount: Number(amount),
          date,
          category,
        },
      )

      onSaved()
    } catch (err) {
      setErrors({
        form: err.message,
      })
    }
  }

  async function handleDelete() {
    const confirmed =
      window.confirm(
        `${deleteText} "${transaction.name}"?`,
      )

    if (!confirmed) {
      return
    }

    try {
      setDeleting(true)

      await deleteTransaction(
        currentUser,
        transaction.id,
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
          ← {cancelAndReturnText}
        </Link>

        <Card className="edit-form-card">
          <h1>
            {editTransactionText}
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
              id="transaction-name"
              label={transactionNameText}
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              error={errors.name}
            />

            <Input
              id="transaction-amount"
              label={amountText}
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

            <Input
              id="transaction-date"
              label={transactionDateText}
              type="date"
              value={date}
              onChange={(event) =>
                setDate(
                  event.target.value,
                )
              }
              error={errors.date}
            />

            <div className="sw-field">
              <label
                className="sw-field__label"
                htmlFor="transaction-category"
              >
                {categoryText}
              </label>

              <select
                id="transaction-category"
                className="sw-field__input"
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  {selectCategoryText}
                </option>

                <option value="Food">
                  {foodText}
                </option>

                <option value="Transport">
                  {transportText}
                </option>

                <option value="Shopping">
                  {shoppingText}
                </option>

                <option value="Bills">
                  {billsText}
                </option>

                <option value="Entertainment">
                  {entertainmentText}
                </option>

                <option value="Other">
                  {otherText}
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
                  ? deletingText
                  : deleteTransactionText}
              </button>

              <Link to="/transactions">
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

export default EditTransactionPage