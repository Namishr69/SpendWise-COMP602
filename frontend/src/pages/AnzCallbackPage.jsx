import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import { completeAnzConnection } from '../api/anzApi.js'
import './AnzCallbackPage.css'

/**
 * Landing page for ANZ's OAuth redirect.
 *
 * ANZ may return the result in the query string (response_type=code) or in the
 * URL fragment (response_type=code id_token). Reading both means switching
 * response types is a backend config change with no frontend impact.
 *
 * This page exists on the frontend rather than the backend because the
 * authorisation code has to be handed to the API together with the user's
 * Firebase ID token — that is what tells the backend which SpendWise account
 * the new bank connection belongs to.
 */

function readAuthResponse() {
  const query = new URLSearchParams(window.location.search)
  // Fragments are never sent to the server, so they must be parsed here.
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))

  const pick = (key) => query.get(key) || fragment.get(key) || null

  return {
    code: pick('code'),
    state: pick('state'),
    idToken: pick('id_token'),
    error: pick('error'),
    errorDescription: pick('error_description'),
  }
}

/**
 * The URL is fully readable during the first render, so the outcome of the
 * redirect is derived synchronously here rather than in an effect. Only the
 * token exchange — which is genuinely asynchronous — happens in the effect.
 */
function initialState() {
  const response = readAuthResponse()

  if (response.error) {
    return {
      response,
      status: 'error',
      message:
        response.errorDescription ||
        (response.error === 'access_denied'
          ? 'You declined the consent request at ANZ.'
          : `ANZ returned an error: ${response.error}`),
    }
  }

  if (!response.code || !response.state) {
    return {
      response,
      status: 'error',
      message: 'This page is only reachable as part of connecting to ANZ.',
    }
  }

  return { response, status: 'connecting', message: '' }
}

function AnzCallbackPage() {
  const navigate = useNavigate()

  const [initial] = useState(initialState)
  const [status, setStatus] = useState(initial.status)
  const [message, setMessage] = useState(initial.message)
  const [accounts, setAccounts] = useState([])

  // React 19 runs effects twice in development. An authorization code is
  // single-use, so a second exchange would fail — this guard keeps it to one.
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    // Clear the credentials out of the address bar so they do not sit in
    // browser history or get copied into a bug report.
    window.history.replaceState({}, '', '/anz/callback')

    if (initial.status !== 'connecting') return

    const { code, state, idToken } = initial.response

    completeAnzConnection({ code, state, idToken })
      .then((result) => {
        setStatus('connected')
        setAccounts(result.accounts || [])
        setMessage(
          result.accountsError
            ? `Connected, but the account list could not be loaded: ${result.accountsError}`
            : ''
        )
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message)
      })
  }, [initial])

  return (
    <div className="anz-callback">
      <Card className="anz-callback__card">
        {status === 'connecting' && (
          <>
            <h2>Connecting to ANZ…</h2>
            <p className="anz-callback__hint">
              Finishing the secure handshake. This only takes a moment.
            </p>
          </>
        )}

        {status === 'connected' && (
          <>
            <h2>ANZ connected</h2>

            {accounts.length > 0 && (
              <ul className="anz-callback__accounts">
                {accounts.map((account) => (
                  <li key={account.accountId}>
                    <span>{account.nickname}</span>
                    <span className="anz-callback__account-meta">
                      {account.identification || account.accountSubType}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {message && <p className="anz-callback__warning">{message}</p>}

            <Button fullWidth onClick={() => navigate('/settings')}>
              Continue
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <h2>Could not connect</h2>
            <p className="anz-callback__error">{message}</p>

            <Button fullWidth onClick={() => navigate('/settings')}>
              Back to settings
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}

export default AnzCallbackPage
