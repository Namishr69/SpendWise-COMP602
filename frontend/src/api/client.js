import { auth } from '../firebase.js'

// Single source of truth for the backend origin the frontend talks to.
//
// Set VITE_API_BASE_URL in frontend/.env to point every API call at a shared
// or deployed backend; leave it unset to hit a backend running locally on
// port 3000. The value may be given with or without a trailing /api — it is
// normalised to exactly one /api segment either way.
const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const API_ORIGIN = RAW_BASE.replace(/\/api$/, '')
export const API_BASE = `${API_ORIGIN}/api`

/**
 * Calls the backend with the current user's Firebase ID token attached, parses
 * the JSON response, and throws a useful message on a non-OK status.
 */
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
