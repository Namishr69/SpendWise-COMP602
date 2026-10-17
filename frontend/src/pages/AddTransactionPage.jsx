import { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import AppShell from '../layouts/AppShell'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { AuthContext } from '../context/authContext.js'
import { CurrencyContext } from '../context/currencyContext.js'
import { createTransaction } from '../api/transactionApi'
import { useTranslations } from '../hooks/useTranslations.js'

import './AddTransactionPage.css'

const ADD_TRANSACTION_TEXT = [
  'Cancel and return',
  'Add transaction',
  'Add a transaction manually to track your spending.',
  'Currency:',
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
  'Cancel',
  'Enter a transaction name.',
  'Enter an amount greater than zero.',
  'Select a transaction date.',
  'Select a category.',
]

function AddTransactionPage() {
  const navigate = useNavigate()

  const { currentUser } =
    useContext(AuthContext)

  const { preferredCurrency } =
    useContext(CurrencyContext)

  const [
    cancelAndReturnText,
    addTransactionText,
    descriptionText,
    currencyText,
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
    cancelText,
    nameErrorText,
    amountErrorText,
    dateErrorText,
    categoryErrorText,
  ] = useTranslations(ADD_TRANSACTION_TEXT)

  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
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

    if (!date) {
      nextErrors.date = dateErrorText
    }

    if (!category.trim()) {
      nextErrors.category = categoryErrorText
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
          ← {cancelAndReturnText}
        </Link>

        <Card className="add-transaction-form-card">
          <h1>{addTransactionText}</h1>

          <p>{descriptionText}</p>

          <p>
            {currencyText}{' '}
            <strong>
              {preferredCurrency}
            </strong>
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
              label={transactionNameText}
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              error={errors.name}
            />

            <Input
              id="transaction-amount"
              label={`${amountText} (${preferredCurrency})`}
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
              label={transactionDateText}
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
                {categoryText}
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

            <div className="add-transaction-form-actions">
              <Link to="/transactions">
                {cancelText}
              </Link>

              <Button type="submit">
                {addTransactionText}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  )
}

export default AddTransactionPage
