import { auth } from '../firebase.js'

// VITE_API_BASE_URL should be just the server origin (e.g. http://localhost:3000),
// WITHOUT a trailing slash or /api. We append the /api prefix ourselves below,
// so a teammate can't accidentally break every request by mis-typing it in .env.
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const API_BASE = `${API_ORIGIN}/api`

/**
 * Calls the backend with the current user's Firebase ID token attached.
 */
async function apiRequest(path, options = {}) {
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

export function registerProfile(profile) {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
}

export function getMyProfile() {
  return apiRequest('/users/me')
}