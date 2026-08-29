import { auth } from '../firebase.js'

const RAW_BASE = 'https://spendwise-comp602.onrender.com'
const API_ORIGIN = RAW_BASE.replace(/\/api$/, '')
const API_BASE = `${API_ORIGIN}/api`

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

export function getSubscriptions() {
  return apiRequest('/subscriptions')
}

export function getSubscription(id) {
  return apiRequest(`/subscriptions/${id}`)
}

export function createSubscription(subscription) {
  return apiRequest('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(subscription),
  })
}

export function updateSubscription(id, changes) {
  return apiRequest(`/subscriptions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
}

export function getPayments(subscriptionId) {
  return apiRequest(`/subscriptions/${subscriptionId}/payments`)
}

export function createPayment(subscriptionId, payment) {
  return apiRequest(`/subscriptions/${subscriptionId}/payments`, {
    method: 'POST',
    body: JSON.stringify(payment),
  })
}
