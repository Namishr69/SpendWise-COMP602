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
  // Reading the manual/email collection is allowed to fail without blanking the
  // bank list, but the failure must still be visible — swallowing it silently
  // made email transactions look like they were never saved.
  const [manualError, setManualError] = useState(null)

  // One NZD → preferred factor applied to every amount, so a long list costs a
  // single conversion request rather than one per row. All stored data is NZD.
  const [rate, setRate] = useState(1)

  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState(null)

  const load = useCallback(async (user) => {
    const [statusData, accountsData, txnsData, manualResult] = await Promise.all([
      getAnzStatus(),
      getBankAccounts(),
      getBankTransactions({ limit: 100 }),
      // Manual + email-detected transactions share one collection. A failure
      // here must not blank out the bank-synced list, so it resolves to an
      // empty list — but the error is kept and surfaced below.
      getTransactions(user).then(
        (data) => ({ data }),
        (err) => ({ data: [], error: err }),
      ),
    ])
    setStatus(statusData)
    setAccounts(accountsData)
    setTransactions(txnsData)
    setManual(manualResult.data)
    setManualError(manualResult.error || null)
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
          setManualError(null)
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

  // The transactions collection holds both manually-added rows and the ones the
  // Gmail scan detected; split them so each gets its own clearly-labelled card.
  const manualTxns = manual.filter((t) => t.source !== 'gmail-detected')
  const emailTxns = manual.filter((t) => t.source === 'gmail-detected')

  return (
    <AppShell activeNav="Transactions">
      <header className="transactions-header">
        <div>
          <p className="transactions-eyebrow">SpendWise</p>
          <h1>Transactions</h1>
          <p>Activity from your bank, your inbox, and anything you add.</p>
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

      {manualError && (
        <Card className="transactions-notice">
          <p>
            Could not load your manual and email transactions:{' '}
            {manualError.message}
          </p>
        </Card>
      )}

      {!connected && (
        <Card className="transactions-notice">
          <h3>No bank connected</h3>
          <p>
            Connect your bank in <strong>Settings</strong> to sync your accounts
            and transactions, or add transactions manually.
          </p>
        </Card>
      )}

      {connected && (
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
      )}

      {/*
        Email-detected spending. Rendered above the bank list so it is never
        buried under 100 bank rows, and rendered even when empty so "nothing
        was detected yet" is distinguishable from "the section isn't there".
      */}
      <Card className="transactions-section">
        <h3>From email</h3>

        {emailTxns.length === 0 ? (
          <p className="transactions-empty">
            No email transactions yet. Connect Gmail in <strong>Settings</strong>,
            then use <strong>Scan inbox for subscriptions</strong>. A receipt
            needs a dollar amount in the email body to be recorded.
          </p>
        ) : (
          <ul className="transactions-list">
            {emailTxns.map((transaction) => (
              <li key={transaction.id} className="transactions-list__item">
                <div className="transactions-list__email">
                  <p className="transactions-list__name">
                    {transaction.subject || transaction.name}
                  </p>
                  <p className="transactions-list__date">
                    {transaction.name}
                    {transaction.sender ? ` · ${transaction.sender}` : ''}
                  </p>
                  <p className="transactions-list__date">
                    {formatDate(transaction.date)}
                    {transaction.category ? ` · ${transaction.category}` : ''}
                  </p>
                </div>

                <span className="money">{show(transaction.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {connected && (
        <Card className="transactions-section">
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
      )}

      {manualTxns.length > 0 && (
        <Card className="transactions-section">
          <h3>Added manually</h3>

          <ul className="transactions-list">
            {manualTxns.map((transaction) => (
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
