import { useEffect, useState } from 'react'
import Button from './ui/Button.jsx'
import {
  startGmailConnection,
  getGmailStatus,
  getGmailPreview,
  disconnectGmail,
} from '../api/gmailApi.js'
import './ConnectGmailSection.css'

/**
 * "Connect Gmail" row of the Settings → Connected accounts card.
 *
 * Connecting hands the user off to Google's own consent screen, so SpendWise
 * never sees their Google password and only ever gets read-only mail access.
 * On return, the backend holds the tokens and this component only displays the
 * connected address plus a few recent subjects as proof it can read the inbox.
 */
function ConnectGmailSection() {
  const [status, setStatus] = useState(null)
  const [preview, setPreview] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      try {
        const result = await getGmailStatus()
        if (cancelled) return

        setStatus(result)

        if (result.connected) {
          // A failed preview should not hide the fact that the connection
          // itself exists.
          try {
            const p = await getGmailPreview()
            if (!cancelled) setPreview(p)
          } catch (previewError) {
            if (!cancelled) setError(previewError.message)
          }
        }
      } catch (statusError) {
        if (!cancelled) setError(statusError.message)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadStatus()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleConnect() {
    setIsBusy(true)
    setError('')

    try {
      const { authorizationUrl } = await startGmailConnection()
      // Full page navigation, not a router push — the next stop is Google.
      window.location.assign(authorizationUrl)
    } catch (connectError) {
      setError(connectError.message)
      setIsBusy(false)
    }
  }

  async function handleDisconnect() {
    setIsBusy(true)
    setError('')

    try {
      await disconnectGmail()
      setStatus({ connected: false })
      setPreview(null)
    } catch (disconnectError) {
      setError(disconnectError.message)
    } finally {
      setIsBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="settings-option">
        <div className="settings-option-text">
          <h3>Gmail</h3>
          <p>Checking connection status…</p>
        </div>
      </div>
    )
  }

  const isConnected = status?.connected === true

  return (
    <>
      <div className="settings-option">
        <div className="settings-option-text">
          <h3>
            Gmail {isConnected && <span className="bank-badge">Connected</span>}
          </h3>

          <p>
            {isConnected
              ? `SpendWise can read your Gmail${
                  status.emailAddress ? ` (${status.emailAddress})` : ''
                } to find subscription confirmations. Read-only access — it never sees your Google password.`
              : 'Connect your Gmail so SpendWise can find subscription confirmations in your inbox. You consent at Google — read-only access, and your password is never shared.'}
          </p>
        </div>

        <Button
          variant={isConnected ? 'secondary' : 'primary'}
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isBusy}
        >
          {isBusy
            ? (isConnected ? 'Disconnecting…' : 'Redirecting…')
            : (isConnected ? 'Disconnect' : 'Connect Gmail')}
        </Button>
      </div>

      {isConnected && preview && typeof preview.messagesTotal === 'number' && (
        <p className="bank-meta">
          {preview.messagesTotal.toLocaleString()} messages in this mailbox
        </p>
      )}

      {isConnected && preview?.recentSubjects?.length > 0 && (
        <ul className="gmail-subjects">
          {preview.recentSubjects.map((msg) => (
            <li key={msg.id} className="gmail-subjects__item">
              <p className="gmail-subjects__subject">{msg.subject}</p>
              <p className="gmail-subjects__from">{msg.from}</p>
            </li>
          ))}
        </ul>
      )}

      {isConnected && status.connectedAt && (
        <p className="bank-meta">
          Connected {new Date(status.connectedAt).toLocaleDateString()}
        </p>
      )}

      {error && <p className="bank-error">{error}</p>}
    </>
  )
}

export default ConnectGmailSection
