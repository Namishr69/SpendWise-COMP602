const API_URL = 'https://spendwise-comp602.onrender.com/api'

async function getToken(currentUser) {
  if (!currentUser) {
    throw new Error('User is not logged in')
  }

  return await currentUser.getIdToken()
}

export async function getTransactions(currentUser) {
  const token = await getToken(currentUser)

  const response = await fetch(`${API_URL}/transactions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to load transactions')
  }

  return data
}

export async function getTransaction(currentUser, transactionId) {
  const token = await getToken(currentUser)

  const response = await fetch(
    `${API_URL}/transactions/${transactionId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to load transaction')
  }

  return data
}

export async function createTransaction(
  currentUser,
  transaction
) {
  const token = await getToken(currentUser)

  const response = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(transaction),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create transaction')
  }

  return data
}

export async function updateTransaction(
  currentUser,
  transactionId,
  changes
) {
  const token = await getToken(currentUser)

  const response = await fetch(
    `${API_URL}/transactions/${transactionId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(changes),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update transaction')
  }

  return data
}

export async function deleteTransaction(
  currentUser,
  transactionId
) {
  const token = await getToken(currentUser)

  const response = await fetch(
    `${API_URL}/transactions/${transactionId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    const data = await response.json()

    throw new Error(
      data.error || 'Failed to delete transaction'
    )
  }
}