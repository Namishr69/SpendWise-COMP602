import { useEffect, useState } from 'react'

import Button from './ui/Button.jsx'
import {
  startAnzConnection,
  getAnzStatus,
  getAnzAccounts,
  disconnectAnz,
} from '../api/anzApi.js'
import {
  useTranslations,
} from '../hooks/useTranslations.js'

import './ConnectBankSection.css'

const CONNECT_BANK_TEXT = [
  'Bank connection',
  'Checking connection status…',
  'Connected',
  'Sandbox mode information',
  'SpendWise connects to the ANZ Sandbox environment. Transaction names shown are representative — a live ANZ account would display real merchant names.',
  'SpendWise can read your account details. It never sees your ANZ password.',
  'Connect securely through ANZ Open Banking. You log in at ANZ — your password is never shared with SpendWise.',
  'Disconnecting…',
  'Redirecting…',
  'Disconnect',
  'Connect ANZ',
  'Connected',
  'Consent',
]

/**
 * "Connected accounts" section of the Settings page.
 *
 * Connecting hands the user off to ANZ's own login, so SpendWise never sees
 * their bank password. On return, the backend holds the tokens and this
 * component only ever displays status and account metadata.
 */

function ConnectBankSection() {
  const [
    bankConnectionText,
    checkingStatusText,
    connectedBadgeText,
    sandboxInfoText,
    sandboxTooltipText,
    connectedDescriptionText,
    disconnectedDescriptionText,
    disconnectingText,
    redirectingText,
    disconnectText,
    connectAnzText,
    connectedText,
    consentText,
  ] = useTranslations(
    CONNECT_BANK_TEXT,
  )

  const [status, setStatus] =
    useState(null)

  const [accounts, setAccounts] =
    useState([])

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [isBusy, setIsBusy] =
    useState(false)

  const [error, setError] =
    useState('')

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      try {
        const result =
          await getAnzStatus()

        if (cancelled) return

        setStatus(result)

        if (result.connected) {
          // A failed account fetch should not
          // hide the fact that the connection
          // itself exists.
          try {
            const list =
              await getAnzAccounts()

            if (!cancelled) {
              setAccounts(list)
            }
          } catch (accountsError) {
            if (!cancelled) {
              setError(
                accountsError.message,
              )
            }
          }
        }
      } catch (statusError) {
        if (!cancelled) {
          setError(
            statusError.message,
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
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
      const {
        authorizationUrl,
      } = await startAnzConnection()

      // Full page navigation, not a router
      // push — the next stop is ANZ.
      window.location.assign(
        authorizationUrl,
      )
    } catch (connectError) {
      setError(
        connectError.message,
      )
      setIsBusy(false)
    }
  }

  async function handleDisconnect() {
    setIsBusy(true)
    setError('')

    try {
      await disconnectAnz()

      setStatus({
        connected: false,
      })

      setAccounts([])
    } catch (disconnectError) {
      setError(
        disconnectError.message,
      )
    } finally {
      setIsBusy(false)
    }
  }

  if (isLoading) {
    return (
      <div className="settings-option">
        <div className="settings-option-text">
          <h3>
            {bankConnectionText}
          </h3>

          <p>
            {checkingStatusText}
          </p>
        </div>
      </div>
    )
  }

  const isConnected =
    status?.connected === true

  return (
    <>
      <div className="settings-option">
        <div className="settings-option-text">
          <h3>
            ANZ{' '}

            {isConnected && (
              <span className="bank-badge">
                {connectedBadgeText}
              </span>
            )}

            <span
              className="bank-info-icon"
              aria-label={
                sandboxInfoText
              }
            >
              ℹ

              <span className="bank-info-tooltip">
                {sandboxTooltipText}
              </span>
            </span>
          </h3>

          <p>
            {isConnected
              ? connectedDescriptionText
              : disconnectedDescriptionText}
          </p>
        </div>

        <Button
          variant={
            isConnected
              ? 'secondary'
              : 'primary'
          }
          onClick={
            isConnected
              ? handleDisconnect
              : handleConnect
          }
          disabled={isBusy}
        >
          {isBusy
            ? isConnected
              ? disconnectingText
              : redirectingText
            : isConnected
              ? disconnectText
              : connectAnzText}
        </Button>
      </div>

      {isConnected &&
        accounts.length > 0 && (
          <ul className="bank-accounts">
            {accounts.map(
              (account) => (
                <li
                  key={
                    account.accountId
                  }
                  className="bank-accounts__item"
                >
                  <div>
                    <p className="bank-accounts__name">
                      {
                        account.nickname
                      }
                    </p>

                    <p className="bank-accounts__meta">
                      {
                        account.accountSubType
                      }

                      {account.identification
                        ? ` · ${account.identification}`
                        : ''}
                    </p>
                  </div>

                  <span className="bank-accounts__currency">
                    {
                      account.currency
                    }
                  </span>
                </li>
              ),
            )}
          </ul>
        )}

      {isConnected &&
        status.connectedAt && (
          <p className="bank-meta">
            {connectedText}{' '}
            {new Date(
              status.connectedAt,
            ).toLocaleDateString()}

            {status.consentId
              ? ` · ${consentText} ${status.consentId.slice(
                  0,
                  12,
                )}…`
              : ''}
          </p>
        )}

      {error && (
        <p className="bank-error">
          {error}
        </p>
      )}
    </>
  )
}

export default ConnectBankSection