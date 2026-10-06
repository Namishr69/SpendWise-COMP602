import { apiRequest } from './client.js'

/**
 * Starts the Gmail OAuth flow. Returns { authorizationUrl } — the caller
 * redirects the browser there so the user consents at Google directly.
 * SpendWise never sees their Google password and only ever gets read-only
 * access to their mail.
 */
export function startGmailConnection() {
  return apiRequest('/gmail/connect', { method: 'POST' })
}

/**
 * Completes the flow. The backend validates state, exchanges the code for
 * tokens, and returns connection status plus proof of read access (profile +
 * recent subjects). Tokens stay server-side.
 */
export function completeGmailConnection({ code, state }) {
  return apiRequest('/gmail/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  })
}

export function getGmailStatus() {
  return apiRequest('/gmail/status')
}

/** Re-runnable proof of read access: mailbox profile + a few recent subjects. */
export function getGmailPreview() {
  return apiRequest('/gmail/preview')
}

export function disconnectGmail() {
  return apiRequest('/gmail/connection', { method: 'DELETE' })
}
