export function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency,
  }).format(amount)
}   