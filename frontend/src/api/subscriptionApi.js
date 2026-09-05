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

export function getPayments(subscriptionId) {
  return apiRequest(`/subscriptions/${subscriptionId}/payments`)
}

export function createPayment(subscriptionId, payment) {
  return apiRequest(`/subscriptions/${subscriptionId}/payments`, {
    method: 'POST',
    body: JSON.stringify(payment),
  })
}
