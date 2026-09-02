import { useContext, useState } from 'react'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { AuthContext } from '../context/AuthProvider.jsx'
import { CurrencyContext } from '../context/CurrencyProvider.jsx'
import { BudgetContext } from '../context/BudgetProvider.jsx'
import { updatePreferredCurrency } from '../api/currencyApi.js'
import { SUPPORTED_CURRENCIES } from '../constants/currencies.js'
import './SettingsPage.css'
import Button from '../components/ui/Button.jsx'
import { useNavigate } from 'react-router-dom'
import Input from '../components/ui/Input.jsx'

const BUDGET_PERIODS = ['Weekly', 'Monthly', 'Yearly']

function SettingsPage() {
  const { currentUser, signOut } = useContext(AuthContext)

  const {
    preferredCurrency,
    setPreferredCurrency,
  } = useContext(CurrencyContext)

  const { budget, setBudget } = useContext(BudgetContext)

  const [isPersonaliseOpen, setIsPersonaliseOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  const [budgetAmount, setBudgetAmount] = useState(budget?.amount ?? '')
  const [budgetPeriod, setBudgetPeriod] = useState(budget?.period ?? 'Monthly')
  const [budgetMessage, setBudgetMessage] = useState('')
  const [budgetError, setBudgetError] = useState('')

  const navigate = useNavigate()

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  function handleSaveBudget(event) {
    event.preventDefault()
    setBudgetMessage('')
    setBudgetError('')

    const amount = Number(budgetAmount)
    if (!budgetAmount || Number.isNaN(amount) || amount <= 0) {
      setBudgetError('Enter an amount greater than zero.')
      return
    }

    // Frontend-only for now: stored in BudgetContext, not saved to the
    // backend yet. That comes in a later stage once this UI is confirmed.
    setBudget({ amount, period: budgetPeriod })
    setBudgetMessage('Budget saved')
  }

  return (
    <AppShell activeNav="Settings">
      <Card>
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() => setIsPersonaliseOpen(!isPersonaliseOpen)}
        >
          <span>Personalise</span>

          <span className="settings-section-arrow">
            {isPersonaliseOpen ? '▲' : '▼'}
          </span>
        </button>

        {isPersonaliseOpen && (
          <div className="settings-section-content">
            <div className="settings-option">
              <div className="settings-option-text">
                <h3>Preferred currency</h3>

                <p>
                  Choose the currency used to display your subscriptions and
                  spending.
                </p>
              </div>

              <div>
                <select
                  id="preferred-currency"
                  className="settings-currency-select"
                  value={preferredCurrency}
                  onChange={async (event) => {
                    const newCurrency = event.target.value

                    setPreferredCurrency(newCurrency)
                    setMessage('')

                    try {
                      await updatePreferredCurrency(
                        currentUser,
                        newCurrency
                      )

                      setMessage('Currency preference saved')
                    } catch (error) {
                      setMessage(error.message)
                    }
                  }}
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option
                      key={currency.code}
                      value={currency.code}
                    >
                      {currency.code} - {currency.name}
                    </option>
                  ))}
                </select>

                {message && (
                  <p className="settings-message">
                    {message}
                  </p>
                )}
              </div>
            </div>

            <div className="settings-option" style={{ marginTop: 20 }}>
              <div className="settings-option-text">
                <h3>Monthly budget</h3>

                <p>
                  Set a recurring spend budget and get alerted when you're
                  close to exceeding it.
                </p>

                {budget && (
                  <p className="settings-budget-current">
                    Current budget: {budget.amount} / {budget.period}
                  </p>
                )}
              </div>

              <form onSubmit={handleSaveBudget} className="settings-budget-form">
                <Input
                  id="budget-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Amount"
                  value={budgetAmount}
                  onChange={(event) => setBudgetAmount(event.target.value)}
                  error={budgetError}
                />
                <select
                  className="settings-currency-select"
                  value={budgetPeriod}
                  onChange={(event) => setBudgetPeriod(event.target.value)}
                >
                  {BUDGET_PERIODS.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
                <Button type="submit">Save</Button>
              </form>
            </div>
            {budgetMessage && (
              <p className="settings-message">{budgetMessage}</p>
            )}
          </div>
        )}
      </Card>
      <Card style={{ marginTop: 16 }}>
        <h3>Account</h3>
        <p style={{ marginTop: 8, marginBottom: 20 }}>{currentUser?.email}</p>
        <Button variant="secondary" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'Logging out...' : 'Logout'}
        </Button>
      </Card>
    </AppShell>
  )
}

export default SettingsPage