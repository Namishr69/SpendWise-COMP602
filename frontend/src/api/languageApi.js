import { API_BASE } from './client.js'

export async function getPreferredLanguage(currentUser) {
  if (!currentUser) {
    throw new Error('User is not logged in')
  }

  const token = await currentUser.getIdToken()

  const response = await fetch(`${API_BASE}/preferred-language`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.error || 'Failed to load preferred language'
    )
  }

  return data
}

export async function updatePreferredLanguage(
  currentUser,
  language
) {
  if (!currentUser) {
    throw new Error('User is not logged in')
  }

  const token = await currentUser.getIdToken()

  const response = await fetch(`${API_BASE}/preferred-language`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      language,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.error || 'Failed to update preferred language'
    )
  }

  return data
}