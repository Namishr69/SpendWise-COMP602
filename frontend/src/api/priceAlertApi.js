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

export function scanGmailForPriceChanges(accessToken) {
  return apiRequest('/price-alerts/gmail-scan', {
    method: 'POST',
    body: JSON.stringify({ accessToken }),
  })
}
