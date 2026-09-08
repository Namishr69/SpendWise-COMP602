export async function updateBudget(currentUser, amount, period) {
  if (!currentUser) {
    throw new Error('User is not logged in')
  }

  const token = await currentUser.getIdToken()

  const response = await fetch('http://localhost:3000/api/budget', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount,
      period,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update budget')
  }

  return data
}