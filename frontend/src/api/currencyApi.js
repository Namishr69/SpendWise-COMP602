import { API_BASE } from './client.js'

export async function updatePreferredCurrency(currentUser, currency) {
  if (!currentUser) {
    throw new Error('User is not logged in')
  }

  const token = await currentUser.getIdToken()

  const response = await fetch(`${API_BASE}/preferred-currency`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currency,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update preferred currency')
  }

  return data
}