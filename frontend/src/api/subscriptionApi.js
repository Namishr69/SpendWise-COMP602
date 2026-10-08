import { apiRequest } from './client.js'

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

export function deleteSubscription(id) {
  // Goes through apiRequest like every other call here: it attaches the ID
  // token and normalises errors. The previous hand-rolled fetch referenced
  // `auth` and `API_BASE`, neither of which this module imports, so Delete
  // threw a ReferenceError instead of deleting anything.
  return apiRequest(`/subscriptions/${id}`, { method: 'DELETE' })
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
