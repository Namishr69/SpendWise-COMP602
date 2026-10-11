export async function updateDarkMode(currentUser, darkMode) {
  if (!currentUser) {
    throw new Error('User is not logged in')
  }

  const token = await currentUser.getIdToken()

  const response = await fetch('http://localhost:3000/api/dark-mode', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      darkMode,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update dark mode')
  }

  return data
}