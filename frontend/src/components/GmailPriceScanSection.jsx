import { useState } from 'react'
import Button from './ui/Button.jsx'
import { requestGmailAccess } from '../utils/googleAuth.js'
import { scanGmailForPriceChanges } from '../api/priceAlertApi'
import './GmailPriceScanSection.css'

// Closing or replacing the Google popup is the user changing their mind,
// not an error worth showing.
const CANCELLED_POPUP_CODES = [
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
]

/**
 * Gmail entry in the "Connected accounts" section of the Settings page.
 *
 * Scanning asks Google for read-only Gmail access, then has the backend look
 * for "your price is changing" emails from providers the user subscribes to.
 * Matches show up as price change notifications on the dashboard.
 */
function GmailPriceScanSection() {
  const [isScanning, setIsScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleScan() {
    setIsScanning(true)
    setResult(null)
    setError('')

    try {
      const accessToken = await requestGmailAccess()
      setResult(await scanGmailForPriceChanges(accessToken))
    } catch (scanError) {
      if (!CANCELLED_POPUP_CODES.includes(scanError.code)) {
        setError(scanError.message)
      }
    } finally {
      setIsScanning(false)
    }
  }

  const found = result?.created.length ?? 0

  return (
    <div className="gmail-scan">
      <div className="settings-option">
        <div className="settings-option-text">
          <h3>Gmail</h3>

          <p>
            Find &ldquo;your price is changing&rdquo; emails from your
            subscriptions. SpendWise only reads your email during a scan and
            never stores access to it.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={handleScan}
          disabled={isScanning}
        >
          {isScanning ? 'Searching…' : 'Search for price change'}
        </Button>
      </div>

      {result && (
        <p className="gmail-scan__result">
          {found === 0
            ? 'No new price changes found.'
            : `${found} new price change${found === 1 ? '' : 's'} found. See your dashboard.`}
          {` Checked ${result.scanned} email${result.scanned === 1 ? '' : 's'}.`}
        </p>
      )}

      {error && <p className="gmail-scan__error">{error}</p>}
    </div>
  )
}

export default GmailPriceScanSection
