import { apiRequest } from './client.js'

/**
 * Starts the ANZ OAuth flow. Returns { authorizationUrl } — the caller
 * redirects the browser there so the user authenticates at ANZ directly.
 * SpendWise never sees their bank credentials.
 */
export function startAnzConnection() {
  return apiRequest('/anz/connect', { method: 'POST' })
}

/**
 * Completes the flow. The backend validates state, exchanges the code for
 * tokens, and returns connection status plus the account list. Tokens stay
 * server-side.
 */
export function completeAnzConnection({ code, state, idToken }) {
  return apiRequest('/anz/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state, id_token: idToken }),
  })
}

export function getAnzStatus() {
  return apiRequest('/anz/status')
}

export function getAnzAccounts() {
  return apiRequest('/anz/accounts')
}

export function disconnectAnz() {
  return apiRequest('/anz/connection', { method: 'DELETE' })
}
