import { auth } from '../firebase.js'

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const API_ORIGIN = RAW_BASE.replace(/\/api$/, '')
const API_BASE = `${API_ORIGIN}/api`

export async function apiRequest(path, options = {}) {
  const user = auth.currentUser
  const token = user ? await user.getIdToken() : null

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || 'Request failed')
  }

  return data
}

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
