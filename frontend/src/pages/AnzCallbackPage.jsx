import {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  useNavigate,
} from 'react-router-dom'

import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import {
  completeAnzConnection,
} from '../api/anzApi.js'
import {
  useTranslations,
} from '../hooks/useTranslations.js'

import './AnzCallbackPage.css'

const ANZ_CALLBACK_TEXT = [
  'Connecting to ANZ…',
  'Finishing the secure handshake. This only takes a moment.',
  'ANZ connected',
  'Continue',
  'Could not connect',
  'Back to settings',
  'You declined the consent request at ANZ.',
  'ANZ returned an error:',
  'This page is only reachable as part of connecting to ANZ.',
  'Connected, but the account list could not be loaded:',
]

/**
 * Landing page for ANZ's OAuth redirect.
 *
 * ANZ may return the result in the query string
 * (response_type=code) or packaged inside a signed
 * JWT response (response_mode=jwt). This parser
 * handles both seamlessly.
 */

function decodeJwtPayload(token) {
  try {
    const base64Url =
      token.split('.')[1]

    const base64 = base64Url
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const jsonPayload =
      decodeURIComponent(
        atob(base64)
          .split('')
          .map(
            (c) =>
              '%' +
              (
                '00' +
                c
                  .charCodeAt(0)
                  .toString(16)
              ).slice(-2),
          )
          .join(''),
      )

    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

function readAuthResponse() {
  const query =
    new URLSearchParams(
      window.location.search,
    )

  const fragment =
    new URLSearchParams(
      window.location.hash.replace(
        /^#/,
        '',
      ),
    )

  const pick = (key) =>
    query.get(key) ||
    fragment.get(key) ||
    null

  // Check if ANZ returned the response
  // bundled as a signed JWT
  // (response_mode=jwt).
  const responseJwt =
    query.get('response') ||
    fragment.get('response')

  if (responseJwt) {
    const decoded =
      decodeJwtPayload(responseJwt)

    if (decoded) {
      return {
        code:
          decoded.code ||
          pick('code'),

        state:
          decoded.state ||
          pick('state'),

        idToken:
          decoded.id_token ||
          pick('id_token'),

        error:
          decoded.error ||
          pick('error'),

        errorDescription:
          decoded.error_description ||
          pick(
            'error_description',
          ),

        response: responseJwt,
      }
    }
  }

  return {
    code: pick('code'),
    state: pick('state'),
    idToken: pick('id_token'),
    error: pick('error'),
    errorDescription: pick(
      'error_description',
    ),
  }
}

function getInitialResponse() {
  return readAuthResponse()
}

function AnzCallbackPage() {
  const navigate = useNavigate()

  const [
    connectingText,
    handshakeText,
    connectedText,
    continueText,
    couldNotConnectText,
    backToSettingsText,
    consentDeclinedText,
    anzErrorText,
    invalidPageText,
    accountsLoadErrorText,
  ] = useTranslations(
    ANZ_CALLBACK_TEXT,
  )

  const [response] = useState(
    getInitialResponse,
  )

  const [status, setStatus] =
    useState(() => {
      if (response.error) {
        return 'error'
      }

      if (
        !response.code ||
        !response.state
      ) {
        return 'error'
      }

      return 'connecting'
    })

  const [message, setMessage] =
    useState('')

  const [accounts, setAccounts] =
    useState([])

  // React 19 runs effects twice in
  // development. An authorization code is
  // single-use, so a second exchange would
  // fail — this guard keeps it to one.
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return

    hasRun.current = true

    // Clear the credentials out of the
    // address bar so they do not sit in
    // browser history or get copied into
    // a bug report.
    window.history.replaceState(
      {},
      '',
      '/anz/callback',
    )

    if (response.error) {
      if (
        response.errorDescription
      ) {
        // ANZ supplied this text, so keep
        // the provider's original message.
        setMessage(
          response.errorDescription,
        )
      } else if (
        response.error ===
        'access_denied'
      ) {
        setMessage(
          consentDeclinedText,
        )
      } else {
        setMessage(
          `${anzErrorText} ${response.error}`,
        )
      }

      return
    }

    if (
      !response.code ||
      !response.state
    ) {
      setMessage(
        invalidPageText,
      )
      return
    }

    completeAnzConnection({
      code: response.code,
      state: response.state,
      idToken: response.idToken,
      response: response.response,
    })
      .then((result) => {
        setStatus('connected')

        setAccounts(
          result.accounts || [],
        )

        setMessage(
          result.accountsError
            ? `${accountsLoadErrorText} ${result.accountsError}`
            : '',
        )
      })
      .catch((err) => {
        setStatus('error')

        // Backend/provider errors are kept
        // unchanged because they are not
        // predictable static UI strings.
        setMessage(err.message)
      })
  }, [
    response,
    consentDeclinedText,
    anzErrorText,
    invalidPageText,
    accountsLoadErrorText,
  ])

  return (
    <div className="anz-callback">
      <Card className="anz-callback__card">
        {status ===
          'connecting' && (
          <>
            <h2>
              {connectingText}
            </h2>

            <p className="anz-callback__hint">
              {handshakeText}
            </p>
          </>
        )}

        {status ===
          'connected' && (
          <>
            <h2>
              {connectedText}
            </h2>

            {accounts.length >
              0 && (
              <ul className="anz-callback__accounts">
                {accounts.map(
                  (account) => (
                    <li
                      key={
                        account.accountId
                      }
                    >
                      <span>
                        {
                          account.nickname
                        }
                      </span>

                      <span className="anz-callback__account-meta">
                        {account.identification ||
                          account.accountSubType}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}

            {message && (
              <p className="anz-callback__warning">
                {message}
              </p>
            )}

            <Button
              fullWidth
              onClick={() =>
                navigate(
                  '/settings',
                )
              }
            >
              {continueText}
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <h2>
              {couldNotConnectText}
            </h2>

            <p className="anz-callback__error">
              {message}
            </p>

            <Button
              fullWidth
              onClick={() =>
                navigate(
                  '/settings',
                )
              }
            >
              {backToSettingsText}
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}

export default AnzCallbackPage