import { useContext, useState } from 'react'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { AuthContext } from '../context/AuthProvider.jsx'
import { CurrencyContext } from '../context/CurrencyProvider.jsx'
import { updatePreferredCurrency } from '../api/currencyApi.js'
import { SUPPORTED_CURRENCIES } from '../constants/currencies.js'
import './SettingsPage.css'
import Button from '../components/ui/Button.jsx'
import { useNavigate } from 'react-router-dom'

function SettingsPage() {
  const { currentUser, signOut } = useContext(AuthContext)

  const {
    preferredCurrency,
    setPreferredCurrency,
  } = useContext(CurrencyContext)

  const [isPersonaliseOpen, setIsPersonaliseOpen] = useState(false)
  const [message, setMessage] = useState('')

  const navigate = useNavigate()

  async function handleLogout() {
  await signOut()
  navigate('/login', { replace: true })
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
          </div>
        )}
      </Card>
      <Card style={{ marginTop: 16 }}>
    <h3>Account</h3>
    <p style={{ marginTop: 8, marginBottom: 20 }}>{currentUser?.email}</p>
    <Button variant="secondary" onClick={handleLogout}>
      Logout
    </Button>
      </Card>
 </AppShell>
  )
}

export default SettingsPage