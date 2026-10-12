import { useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import ConnectBankSection from '../components/ConnectBankSection.jsx'
import Button from '../components/ui/Button.jsx'
import Input from '../components/ui/Input.jsx'

import { AuthContext } from '../context/authContext.js'
import { CurrencyContext } from '../context/currencyContext.js'
import { LanguageContext } from '../context/languageContext.js'
import { BudgetContext } from '../context/BudgetProvider.jsx'
import { ThemeContext } from '../context/ThemeProvider.jsx'

import { updatePreferredCurrency } from '../api/currencyApi.js'
import { updatePreferredLanguage } from '../api/languageApi.js'
import { updateBudget } from '../api/budgetApi.js'
import { updateDarkMode } from '../api/darkModeApi.js'

import { SUPPORTED_CURRENCIES } from '../constants/currencies.js'
import { LANGUAGES } from '../constants/languages.js'

import { useTranslations } from '../hooks/useTranslations.js'

import './SettingsPage.css'

const BUDGET_PERIODS = [
  'Weekly',
  'Monthly',
  'Yearly',
]

const SETTINGS_TEXT = [
  'Personalise',
  'Preferred currency',
  'Choose the currency used to display your subscriptions and spending.',
  'Preferred language',
  'Choose the language used to display SpendWise.',
  'Monthly budget',
  "Set a recurring spend budget and get alerted when you're close to exceeding it.",
  'Current budget',
  'Amount',
  'Weekly',
  'Monthly',
  'Yearly',
  'Saving...',
  'Save',
  'Dark mode',
  "Switch to a dark theme that's easier on the eyes at night.",
  'Connected accounts',
  'Account',
  'Logging out...',
  'Logout',
  'Enter an amount greater than zero.',
  'Budget saved',
  'Language preference saved',
  'Currency preference saved',
]

function SettingsPage() {
  const {
    currentUser,
    signOut,
  } = useContext(AuthContext)

  const {
    preferredCurrency,
    setPreferredCurrency,
  } = useContext(CurrencyContext)

  const {
    preferredLanguage,
    setPreferredLanguage,
  } = useContext(LanguageContext)

  const {
    budget,
    setBudget,
  } = useContext(BudgetContext)

  const {
    darkMode,
    setDarkModeState,
  } = useContext(ThemeContext)

  const [
    personaliseText,
    preferredCurrencyText,
    currencyDescriptionText,
    preferredLanguageText,
    languageDescriptionText,
    monthlyBudgetText,
    budgetDescriptionText,
    currentBudgetText,
    amountText,
    weeklyText,
    monthlyText,
    yearlyText,
    savingText,
    saveText,
    darkModeText,
    darkModeDescriptionText,
    connectedAccountsText,
    accountText,
    loggingOutText,
    logoutText,
    amountErrorText,
    budgetSavedText,
    languageSavedText,
    currencySavedText,
  ] = useTranslations(
    SETTINGS_TEXT,
  )

  const [
    isPersonaliseOpen,
    setIsPersonaliseOpen,
  ] = useState(false)

  const [
    isBanksOpen,
    setIsBanksOpen,
  ] = useState(false)

  const [
    message,
    setMessage,
  ] = useState('')

  const [
    languageMessage,
    setLanguageMessage,
  ] = useState('')

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false)

  const [
    budgetAmount,
    setBudgetAmount,
  ] = useState(
    budget?.amount ?? '',
  )

  const [
    budgetPeriod,
    setBudgetPeriod,
  ] = useState(
    budget?.period ?? 'Monthly',
  )

  const [
    savingTheme,
    setSavingTheme,
  ] = useState(false)

  const [
    budgetMessage,
    setBudgetMessage,
  ] = useState('')

  const [
    budgetError,
    setBudgetError,
  ] = useState('')

  const [
    savingBudget,
    setSavingBudget,
  ] = useState(false)

  const navigate = useNavigate()

  async function handleToggleDarkMode() {
    const newValue = !darkMode

    setDarkModeState(newValue)
    setSavingTheme(true)

    try {
      await updateDarkMode(
        currentUser,
        newValue,
      )
    } catch (error) {
      console.error(
        'Failed to save dark mode:',
        error,
      )

      setDarkModeState(!newValue)
    } finally {
      setSavingTheme(false)
    }
  }

  async function handleLogout() {
    if (loggingOut) return

    setLoggingOut(true)

    try {
      await signOut()

      navigate(
        '/login',
        {
          replace: true,
        },
      )
    } finally {
      setLoggingOut(false)
    }
  }

  async function handleSaveBudget(
    event,
  ) {
    event.preventDefault()

    setBudgetMessage('')
    setBudgetError('')

    const amount =
      Number(budgetAmount)

    if (
      !budgetAmount ||
      Number.isNaN(amount) ||
      amount <= 0
    ) {
      setBudgetError(
        amountErrorText,
      )
      return
    }

    setSavingBudget(true)

    try {
      const result =
        await updateBudget(
          currentUser,
          amount,
          budgetPeriod,
        )

      setBudget(result.budget)

      setBudgetMessage(
        budgetSavedText,
      )
    } catch (error) {
      setBudgetError(
        error.message,
      )
    } finally {
      setSavingBudget(false)
    }
  }

  async function handleLanguageChange(
    event,
  ) {
    const newLanguage =
      event.target.value

    const previousLanguage =
      preferredLanguage

    setPreferredLanguage(
      newLanguage,
    )

    setLanguageMessage('')

    try {
      await updatePreferredLanguage(
        currentUser,
        newLanguage,
      )

      setLanguageMessage(
        languageSavedText,
      )
    } catch (error) {
      setPreferredLanguage(
        previousLanguage,
      )

      setLanguageMessage(
        error.message,
      )
    }
  }

  const isUnchanged =
    budget &&
    Number(budgetAmount) ===
      budget.amount &&
    budgetPeriod ===
      budget.period

  function getTranslatedPeriod(
    period,
  ) {
    if (period === 'Weekly') {
      return weeklyText
    }

    if (period === 'Monthly') {
      return monthlyText
    }

    if (period === 'Yearly') {
      return yearlyText
    }

    return period
  }

  return (
    <AppShell activeNav="Settings">
      {/* PERSONALISE */}
      <Card>
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() =>
            setIsPersonaliseOpen(
              !isPersonaliseOpen,
            )
          }
          aria-expanded={
            isPersonaliseOpen
          }
        >
          <span>
            {personaliseText}
          </span>

          <span className="settings-section-arrow">
            {isPersonaliseOpen
              ? '▲'
              : '▼'}
          </span>
        </button>

        {isPersonaliseOpen && (
          <div className="settings-section-content">
            {/* PREFERRED CURRENCY */}
            <div className="settings-option">
              <div className="settings-option-text">
                <h3>
                  {preferredCurrencyText}
                </h3>

                <p>
                  {
                    currencyDescriptionText
                  }
                </p>
              </div>

              <div>
                <select
                  id="preferred-currency"
                  className="settings-currency-select"
                  value={
                    preferredCurrency
                  }
                  onChange={async (
                    event,
                  ) => {
                    const newCurrency =
                      event.target
                        .value

                    setPreferredCurrency(
                      newCurrency,
                    )

                    setMessage('')

                    try {
                      await updatePreferredCurrency(
                        currentUser,
                        newCurrency,
                      )

                      setMessage(
                        currencySavedText,
                      )
                    } catch (
                      error
                    ) {
                      setMessage(
                        error.message,
                      )
                    }
                  }}
                >
                  {SUPPORTED_CURRENCIES.map(
                    (currency) => (
                      <option
                        key={
                          currency.code
                        }
                        value={
                          currency.code
                        }
                      >
                        {
                          currency.code
                        }{' '}
                        -{' '}
                        {
                          currency.name
                        }
                      </option>
                    ),
                  )}
                </select>

                {message && (
                  <p className="settings-message">
                    {message}
                  </p>
                )}
              </div>
            </div>

            {/* PREFERRED LANGUAGE */}
            <div
              className="settings-option"
              style={{
                marginTop: 20,
              }}
            >
              <div className="settings-option-text">
                <h3>
                  {
                    preferredLanguageText
                  }
                </h3>

                <p>
                  {
                    languageDescriptionText
                  }
                </p>
              </div>

              <div>
                <select
                  id="preferred-language"
                  className="settings-currency-select"
                  value={
                    preferredLanguage
                  }
                  onChange={
                    handleLanguageChange
                  }
                >
                  {LANGUAGES.map(
                    (language) => (
                      <option
                        key={
                          language.code
                        }
                        value={
                          language.code
                        }
                      >
                        {
                          language.name
                        }
                      </option>
                    ),
                  )}
                </select>

                {languageMessage && (
                  <p className="settings-message">
                    {
                      languageMessage
                    }
                  </p>
                )}
              </div>
            </div>

            {/* MONTHLY BUDGET */}
            <div
              className="settings-option"
              style={{
                marginTop: 20,
              }}
            >
              <div className="settings-option-text">
                <h3>
                  {monthlyBudgetText}
                </h3>

                <p>
                  {
                    budgetDescriptionText
                  }
                </p>

                {budget && (
                  <p className="settings-budget-current">
                    {
                      currentBudgetText
                    }
                    :{' '}
                    {budget.amount} /{' '}
                    {getTranslatedPeriod(
                      budget.period,
                    )}
                  </p>
                )}
              </div>

              <form
                onSubmit={
                  handleSaveBudget
                }
                className="settings-budget-form"
              >
                <Input
                  id="budget-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder={
                    amountText
                  }
                  value={
                    budgetAmount
                  }
                  onChange={(
                    event,
                  ) =>
                    setBudgetAmount(
                      event.target
                        .value,
                    )
                  }
                  error={
                    budgetError
                  }
                />

                <select
                  className="settings-currency-select"
                  value={
                    budgetPeriod
                  }
                  onChange={(
                    event,
                  ) =>
                    setBudgetPeriod(
                      event.target
                        .value,
                    )
                  }
                >
                  {BUDGET_PERIODS.map(
                    (period) => (
                      <option
                        key={
                          period
                        }
                        value={
                          period
                        }
                      >
                        {getTranslatedPeriod(
                          period,
                        )}
                      </option>
                    ),
                  )}
                </select>

                <Button
                  type="submit"
                  disabled={
                    isUnchanged ||
                    savingBudget
                  }
                >
                  {savingBudget
                    ? savingText
                    : saveText}
                </Button>
              </form>
            </div>

            {budgetMessage && (
              <p className="settings-message">
                {budgetMessage}
              </p>
            )}

            {/* DARK MODE */}
            <div
              className="settings-option"
              style={{
                marginTop: 20,
              }}
            >
              <div className="settings-option-text">
                <h3>
                  {darkModeText}
                </h3>

                <p>
                  {
                    darkModeDescriptionText
                  }
                </p>
              </div>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={
                    darkMode
                  }
                  onChange={
                    handleToggleDarkMode
                  }
                  disabled={
                    savingTheme
                  }
                />

                <span className="settings-toggle__slider"></span>
              </label>
            </div>
          </div>
        )}
      </Card>

      {/* CONNECTED ACCOUNTS */}
      <Card
        style={{
          marginTop: 16,
        }}
      >
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() =>
            setIsBanksOpen(
              !isBanksOpen,
            )
          }
          aria-expanded={
            isBanksOpen
          }
        >
          <span>
            {connectedAccountsText}
          </span>

          <span className="settings-section-arrow">
            {isBanksOpen
              ? '▲'
              : '▼'}
          </span>
        </button>

        {isBanksOpen && (
          <div className="settings-section-content">
            <ConnectBankSection />
          </div>
        )}
      </Card>

      {/* ACCOUNT */}
      <Card
        style={{
          marginTop: 16,
        }}
      >
        <h3>
          {accountText}
        </h3>

        <p
          style={{
            marginTop: 8,
            marginBottom: 20,
          }}
        >
          {currentUser?.email}
        </p>

        <Button
          variant="secondary"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut
            ? loggingOutText
            : logoutText}
        </Button>
      </Card>
    </AppShell>
  )
}

export default SettingsPage