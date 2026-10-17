// Turns a list of subscriptions into CSV text for export.
//
// The first line is a header row; each following line is one subscription
// with its name, amount, payment frequency (billing cycle), and next renewal
// date, in that order. Fields containing commas, quotes, or line breaks are
// quoted so the file stays parseable.
const HEADER = ['Name', 'Amount', 'Payment Frequency', 'Next Renewal Date']

function escapeField(value) {
  const text = value === null || value === undefined ? '' : String(value)

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

export function buildSubscriptionsCsv(subscriptions) {
  const rows = [HEADER]

  for (const subscription of subscriptions) {
    rows.push([
      subscription.name,
      subscription.amount,
      subscription.billingCycle,
      subscription.nextPaymentDate,
    ])
  }

  return rows.map((row) => row.map(escapeField).join(',')).join('\n')
}
