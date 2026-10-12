import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import { completeGmailConnection } from '../api/gmailApi.js'
import './GmailCallbackPage.css'

/**
 * Landing page for Google's OAuth redirect.
 *
 * Google returns the result in the query string: ?code&state on success, or
 * ?error=access_denied&state when the user declines at the consent screen.
 */

function readAuthResponse() {
  const query = new URLSearchParams(window.location.search)
  return {
    code: query.get('code'),
    state: query.get('state'),
    error: query.get('error'),
  }
}

function initialState() {
  const response = readAuthResponse()

  if (response.error) {
    return {
      response,
      status: 'error',
      message:
        response.error === 'access_denied'
          ? 'You declined the consent request at Google.'
          : `Google returned an error: ${response.error}`,
    }
  }

  if (!response.code || !response.state) {
    return {
      response,
      status: 'error',
      message: 'This page is only reachable as part of connecting your Gmail.',
    }
  }

  return { response, status: 'connecting', message: '' }
}

function GmailCallbackPage() {
  const navigate = useNavigate()

  const [initial] = useState(initialState)
  const [status, setStatus] = useState(initial.status)
  const [message, setMessage] = useState(initial.message)
  const [emailAddress, setEmailAddress] = useState(null)
  const [recentSubjects, setRecentSubjects] = useState([])

  // React 19 runs effects twice in development. An authorization code is
  // single-use, so a second exchange would fail — this guard keeps it to one.
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    // Clear the credentials out of the address bar so they do not sit in
    // browser history or get copied into a bug report.
    window.history.replaceState({}, '', '/gmail/callback')

    if (initial.status !== 'connecting') return

    const { code, state } = initial.response

    completeGmailConnection({ code, state })
      .then((result) => {
        setStatus('connected')
        setEmailAddress(result.emailAddress || result.profile?.emailAddress || null)
        setRecentSubjects(result.recentSubjects || [])
        setMessage(
          result.readError
            ? `Connected, but reading the inbox failed: ${result.readError}`
            : ''
        )
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.message)
      })
  }, [initial])

  return (
    <div className="gmail-callback">
      <Card className="gmail-callback__card">
        {status === 'connecting' && (
          <>
            <h2>Connecting your Gmail…</h2>
            <p className="gmail-callback__hint">
              Finishing the secure handshake. This only takes a moment.
            </p>
          </>
        )}

        {status === 'connected' && (
          <>
            <h2>Gmail connected</h2>

            {emailAddress && <p className="gmail-callback__hint">{emailAddress}</p>}

            {recentSubjects.length > 0 && (
              <ul className="gmail-callback__subjects">
                {recentSubjects.map((msg) => (
                  <li key={msg.id}>
                    <span className="gmail-callback__subject">{msg.subject}</span>
                    <span className="gmail-callback__subject-meta">{msg.from}</span>
                  </li>
                ))}
              </ul>
            )}

            {message && <p className="gmail-callback__warning">{message}</p>}

            <Button fullWidth onClick={() => navigate('/settings')}>
              Continue
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <h2>Could not connect</h2>
            <p className="gmail-callback__error">{message}</p>

            <Button fullWidth onClick={() => navigate('/settings')}>
              Back to settings
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}

export default GmailCallbackPage
