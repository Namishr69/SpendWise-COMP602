import { useCallback, useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import { CurrencyContext } from '../context/currencyContext.js'
import { convertCurrency } from '../api/exchangeRateApi.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { getAnzStatus } from '../api/anzApi.js'
import { getTransactions } from '../api/transactionApi.js'
import {
  getBankAccounts,
  getBankTransactions,
  syncBankData,
} from '../api/bankDataApi.js'
import './TransactionsPage.css'

function formatDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function TransactionsPage() {
  const { preferredCurrency } = useContext(CurrencyContext)

  const [status, setStatus] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  // Manually added transactions live alongside the bank-synced ones so both
  // ways of tracking spending show up on this page.
  const [manual, setManual] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // One NZD → preferred factor applied to every amount, so a long list costs a
  // single conversion request rather than one per row. All stored data is NZD.
  const [rate, setRate] = useState(1)

  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)

  const load = useCallback(async (user) => {
    const [statusData, accountsData, txnsData, manualData] = await Promise.all([
      getAnzStatus(),
      getBankAccounts(),
      getBankTransactions({ limit: 100 }),
      // Manual transactions are a separate feature — a failure there must not
      // blank out the bank-synced list.
      getTransactions(user).catch(() => []),
    ])
    setStatus(statusData)
    setAccounts(accountsData)
    setTransactions(txnsData)
    setManual(manualData)
  }, [])

  useEffect(() => {
    let cancelled = false

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) {
          setStatus(null)
          setAccounts([])
          setTransactions([])
          setManual([])
          setError(null)
          setLoading(false)
        }
        return
      }

      try {
        await load(user)
        if (!cancelled) setError(null)
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [load])

  useEffect(() => {
    let cancelled = false
    convertCurrency(1, 'NZD', preferredCurrency)
      .then((r) => {
        if (!cancelled) setRate(r)
      })
      .catch(() => {
        if (!cancelled) setRate(1)
      })
    return () => {
      cancelled = true
    }
  }, [preferredCurrency])

  async function handleRefresh() {
    setSyncing(true)
    setSyncMessage(null)
    setError(null)
    try {
      const summary = await syncBankData()
      await load(auth.currentUser)
      setSyncMessage(
        `Synced ${summary.transactionsSynced} transactions across ` +
          `${summary.accounts} account(s). ${summary.subscriptionsCreated} new ` +
          `subscription(s) detected.`
      )
    } catch (err) {
      setError(err)
    } finally {
      setSyncing(false)
    }
  }

  const show = (amount) =>
    formatCurrency((Number(amount) || 0) * rate, preferredCurrency)

  if (loading) {
    return (
      <AppShell activeNav="Transactions">
        <p>Loading transactions…</p>
      </AppShell>
    )
  }

  const connected = Boolean(status?.connected)

  return (
    <AppShell activeNav="Transactions">
      <header className="transactions-header">
        <div>
          <p className="transactions-eyebrow">SpendWise</p>
          <h1>Transactions</h1>
          <p>Balances and activity synced from your bank.</p>
        </div>

        <div className="transactions-actions">
          {connected && (
            <button
              type="button"
              className="transactions-refresh"
              onClick={handleRefresh}
              disabled={syncing}
            >
              {syncing ? 'Syncing…' : '↻ Refresh'}
            </button>
          )}

          <Link className="transactions-add" to="/transactions/new">
            + Add transaction
          </Link>
        </div>
      </header>

      {syncMessage && (
        <Card className="transactions-notice">
          <p>{syncMessage}</p>
        </Card>
      )}

      {error && (
        <Card className="transactions-notice">
          <p>Something went wrong: {error.message}</p>
        </Card>
      )}

      {!connected ? (
        <Card className="transactions-notice">
          <h3>No bank connected</h3>
          <p>
            Connect your bank in <strong>Settings</strong> to sync your accounts
            and transactions, or add transactions manually.
          </p>
        </Card>
      ) : (
        <>
          <section className="transactions-accounts">
            {accounts.map((account) => (
              <Card
                key={account.accountId}
                tone="forest"
                className="transactions-account"
              >
                <p>{account.nickname || 'Account'}</p>
                <h2 className="money">
                  {account.balance != null ? show(account.balance) : '—'}
                </h2>
                <p className="transactions-account__meta">
                  {account.accountSubType || account.accountType || ''}
                  {account.identification ? ` · ${account.identification}` : ''}
                </p>
              </Card>
            ))}
          </section>

          <Card>
            <h3>Recent transactions</h3>

            {transactions.length === 0 ? (
              <p className="transactions-empty">
                No transactions yet. Hit Refresh to sync from your bank.
              </p>
            ) : (
              <ul className="transactions-list">
                {transactions.map((txn) => (
                  <li key={txn.transactionId} className="transactions-list__item">
                    <div>
                      <p className="transactions-list__name">
                        {txn.merchant || txn.description}
                      </p>
                      <p className="transactions-list__date">
                        {formatDate(txn.bookedAt)}
                      </p>
                    </div>

                    <span
                      className={`money transactions-amount ${
                        txn.direction === 'credit'
                          ? 'transactions-amount--credit'
                          : ''
                      }`}
                    >
                      {txn.direction === 'debit' ? '−' : '+'}
                      {show(txn.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {manual.length > 0 && (
        <Card>
          <h3>Added manually</h3>

          <ul className="transactions-list">
            {manual.map((transaction) => (
              <li key={transaction.id} className="transactions-list__item">
                <div>
                  <p className="transactions-list__name">{transaction.name}</p>
                  <p className="transactions-list__date">
                    {transaction.date}
                    {transaction.category ? ` · ${transaction.category}` : ''}
                  </p>
                </div>

                <span className="transactions-list__manual">
                  <span className="money">{show(transaction.amount)}</span>
                  <Link
                    className="transactions-list__edit"
                    to={`/transactions/${transaction.id}/edit`}
                  >
                    Edit
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AppShell>
  )
}

export default TransactionsPage
