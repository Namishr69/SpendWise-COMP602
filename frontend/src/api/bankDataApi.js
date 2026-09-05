import { apiRequest } from './client.js'

/**
 * Bank data lives in Firestore after a sync; these reads never wait on ANZ.
 * syncBankData is the one call that reaches out to the bank (via the backend),
 * pulling fresh balances and transactions and re-running subscription
 * detection. Access/refresh tokens stay server-side — nothing here returns one.
 */

/** Pulls fresh data from ANZ into Firestore. Returns a sync summary. */
export function syncBankData() {
  return apiRequest('/anz/sync', { method: 'POST' })
}

/** Synced accounts with their latest balances, read from Firestore. */
export function getBankAccounts() {
  return apiRequest('/anz/bank-accounts')
}

/**
 * Recent transactions from Firestore. Optional { accountId, limit } narrow the
 * result to one account or cap the count.
 */
export function getBankTransactions({ accountId, limit } = {}) {
  const query = new URLSearchParams()
  if (accountId) query.set('accountId', accountId)
  if (limit) query.set('limit', String(limit))

  const suffix = query.toString() ? `?${query.toString()}` : ''
  return apiRequest(`/anz/transactions${suffix}`)
}

/** Pre-computed dashboard figures (all NZD; the UI converts). */
export function getDashboard() {
  return apiRequest('/anz/dashboard')
}
