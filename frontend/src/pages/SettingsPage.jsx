import { useContext, useState } from 'react'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import ConnectBankSection from '../components/ConnectBankSection.jsx'
import { AuthContext } from '../context/authContext.js'
import { CurrencyContext } from '../context/currencyContext.js'
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

  // Combined state variables from both branches
  const [isPersonaliseOpen, setIsPersonaliseOpen] = useState(false)
  const [isBanksOpen, setIsBanksOpen] = useState(false) 
  const [message, setMessage] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

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

      {/* From feature/anz-open-banking-3: Connected Accounts section */}
      <Card>
        <button
          type="button"
          className="settings-section-toggle"
          onClick={() => setIsBanksOpen(!isBanksOpen)}
        >
          <span>Connected accounts</span>

          <span className="settings-section-arrow">
            {isBanksOpen ? '▲' : '▼'}
          </span>
        </button>

        {isBanksOpen && (
          <div className="settings-section-content">
            <ConnectBankSection />
          </div>
        )}
      </Card>

      {/* From main: Logout and Account section */}
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