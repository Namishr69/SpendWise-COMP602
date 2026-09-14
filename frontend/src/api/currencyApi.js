import { API_BASE } from './client.js'

export async function getPreferredCurrency(currentUser) {
  if (!currentUser) {
    throw new Error('User is not logged in')
  }

  const token = await currentUser.getIdToken()

  const response = await fetch(`${API_BASE}/preferred-currency`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.error || 'Failed to load preferred currency'
    )
  }

  return data
}

export async function updatePreferredCurrency(
  currentUser,
  currency
) {
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
    throw new Error(
      data.error || 'Failed to update preferred currency'
    )
  }

  return data
}