export async function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) {
    return amount
  }

  const response = await fetch(
    'http://localhost:3000/api/convert-currency',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        fromCurrency,
        toCurrency,
      }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Failed to convert currency')
  }

  return data.convertedAmount
}