import { API_BASE } from './client.js'

export async function translateText(
  currentUser,
  text,
  targetLanguage
) {
  if (!currentUser) {
    throw new Error('User is not logged in')
  }

  if (!text) {
    return ''
  }

  if (targetLanguage === 'en') {
    return text
  }

  const token = await currentUser.getIdToken()

  const response = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text,
      targetLanguage,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.error || 'Failed to translate text'
    )
  }

  return data.translatedText
}

export async function translateTexts(
  currentUser,
  texts,
  targetLanguage
) {
  if (!currentUser) {
    throw new Error('User is not logged in')
  }

  if (!Array.isArray(texts) || texts.length === 0) {
    return []
  }

  if (targetLanguage === 'en') {
    return texts
  }

  const token = await currentUser.getIdToken()

  const response = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      texts,
      targetLanguage,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.error || 'Failed to translate text'
    )
  }

  return data.translatedTexts
}