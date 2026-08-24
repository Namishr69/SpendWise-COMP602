import { auth } from '../firebase.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

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