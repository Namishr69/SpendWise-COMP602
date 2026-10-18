import { apiRequest } from './client.js'

export function getPriceAlerts(subscriptionId) {
  const query = subscriptionId
    ? `?subscriptionId=${encodeURIComponent(subscriptionId)}`
    : ''

  return apiRequest(`/price-alerts${query}`)
}

export function dismissPriceAlert(id) {
  return apiRequest(`/price-alerts/${id}/dismiss`, {
    method: 'PATCH',
  })
}
