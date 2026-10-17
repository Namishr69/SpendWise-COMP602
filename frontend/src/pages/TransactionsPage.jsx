import {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import {
  onAuthStateChanged,
} from 'firebase/auth'

import { auth } from '../firebase'
import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import {
  CurrencyContext,
} from '../context/currencyContext.js'
import {
  convertCurrency,
} from '../api/exchangeRateApi.js'
import {
  formatCurrency,
} from '../utils/formatCurrency.js'
import {
  getAnzStatus,
} from '../api/anzApi.js'
import {
  getTransactions,
} from '../api/transactionApi.js'
import {
  getBankAccounts,
  getBankTransactions,
  syncBankData,
} from '../api/bankDataApi.js'
import {
  useTranslations,
} from '../hooks/useTranslations.js'

import './TransactionsPage.css'

const TRANSACTIONS_TEXT = [
  'Loading transactions...',
  'Transactions',
  'Balances and activity synced from your bank.',
  'Syncing...',
  'Refresh',
  '+ Add transaction',
  'Something went wrong:',
  'No bank connected',
  'Connect your bank in Settings to sync your accounts and transactions, or add transactions manually.',
  'Account',
  'Recent transactions',
  'No transactions yet. Hit Refresh to sync from your bank.',
  'Added manually',
  'Edit',
  'Synced',
  'transactions across',
  'account(s).',
  'new subscription(s) detected.',
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Other',
]

function formatDate(iso) {
  if (!iso) return ''

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString(
    'en-NZ',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  )
}

function TransactionsPage() {
  const { preferredCurrency } =
    useContext(CurrencyContext)

  const [
    loadingTransactionsText,
    transactionsText,
    descriptionText,
    syncingText,
    refreshText,
    addTransactionText,
    errorText,
    noBankConnectedText,
    connectBankText,
    accountText,
    recentTransactionsText,
    noTransactionsText,
    addedManuallyText,
    editText,
    syncedText,
    transactionsAcrossText,
    accountsText,
    subscriptionsDetectedText,
    foodText,
    transportText,
    shoppingText,
    billsText,
    entertainmentText,
    otherText,
  ] = useTranslations(
    TRANSACTIONS_TEXT,
  )

  const [status, setStatus] =
    useState(null)

  const [accounts, setAccounts] =
    useState([])

  const [
    transactions,
    setTransactions,
  ] = useState([])

  // Manually added transactions live
  // alongside bank-synced transactions.
  const [manual, setManual] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState(null)

  // One NZD -> preferred currency factor
  // is reused for every displayed amount.
  const [rate, setRate] =
    useState(1)

  const [syncing, setSyncing] =
    useState(false)

  const [
    syncSummary,
    setSyncSummary,
  ] = useState(null)

  const load = useCallback(
    async (user) => {
      const [
        statusData,
        accountsData,
        txnsData,
        manualData,
      ] = await Promise.all([
        getAnzStatus(),
        getBankAccounts(),
        getBankTransactions({
          limit: 100,
        }),

        // Manual transactions are a
        // separate feature. A failure
        // here should not blank the
        // bank-synced transaction list.
        getTransactions(user).catch(
          () => [],
        ),
      ])

      setStatus(statusData)
      setAccounts(accountsData)
      setTransactions(txnsData)
      setManual(manualData)
    },
    [],
  )

  useEffect(() => {
    let cancelled = false

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
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

            if (!cancelled) {
              setError(null)
            }
          } catch (err) {
            if (!cancelled) {
              setError(err)
            }
          } finally {
            if (!cancelled) {
              setLoading(false)
            }
          }
        },
      )

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [load])

  useEffect(() => {
    let cancelled = false

    convertCurrency(
      1,
      'NZD',
      preferredCurrency,
    )
      .then((result) => {
        if (!cancelled) {
          setRate(result)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRate(1)
        }
      })

    return () => {
      cancelled = true
    }
  }, [preferredCurrency])

  async function handleRefresh() {
    setSyncing(true)
    setSyncSummary(null)
    setError(null)

    try {
      const summary =
        await syncBankData()

      await load(auth.currentUser)

      setSyncSummary(summary)
    } catch (err) {
      setError(err)
    } finally {
      setSyncing(false)
    }
  }

  const show = (amount) =>
    formatCurrency(
      (Number(amount) || 0) * rate,
      preferredCurrency,
    )

  function translateCategory(
    category,
  ) {
    switch (category?.toLowerCase()) {
      case 'food':
        return foodText

      case 'transport':
        return transportText

      case 'shopping':
        return shoppingText

      case 'bills':
        return billsText

      case 'entertainment':
        return entertainmentText

      case 'other':
        return otherText

      default:
        return category || ''
    }
  }

  if (loading) {
    return (
      <AppShell activeNav="Transactions">
        <p>
          {loadingTransactionsText}
        </p>
      </AppShell>
    )
  }

  const connected =
    Boolean(status?.connected)

  // The transactions collection holds both manually-added rows and the ones the
  // Gmail scan detected; split them so each gets its own clearly-labelled card.
  const manualTxns = manual.filter((t) => t.source !== 'gmail-detected')
  const emailTxns = manual.filter((t) => t.source === 'gmail-detected')

  return (
    <AppShell activeNav="Transactions">
      <header className="transactions-header">
        <div>
          <p className="transactions-eyebrow">
            SpendWise
          </p>

          <h1>
            {transactionsText}
          </h1>

          <p>
            {descriptionText}
          </p>
        </div>

        <div className="transactions-actions">
          {connected && (
            <button
              type="button"
              className="transactions-refresh"
              onClick={handleRefresh}
              disabled={syncing}
            >
              {syncing
                ? syncingText
                : `↻ ${refreshText}`}
            </button>
          )}

          <Link
            className="transactions-add"
            to="/transactions/new"
          >
            {addTransactionText}
          </Link>
        </div>
      </header>

      {syncSummary && (
        <Card className="transactions-notice">
          <p>
            {syncedText}{' '}
            {
              syncSummary
                .transactionsSynced
            }{' '}
            {transactionsAcrossText}{' '}
            {syncSummary.accounts}{' '}
            {accountsText}{' '}
            {
              syncSummary
                .subscriptionsCreated
            }{' '}
            {subscriptionsDetectedText}
          </p>
        </Card>
      )}

      {error && (
        <Card className="transactions-notice">
          <p>
            {errorText}{' '}
            {error.message}
          </p>
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
          <h3>
            {noBankConnectedText}
          </h3>

          <p>
            {connectBankText}
          </p>
        </Card>
      ) : (
        <>
          <section className="transactions-accounts">
            {accounts.map(
              (account) => (
                <Card
                  key={
                    account.accountId
                  }
                  tone="forest"
                  className="transactions-account"
                >
                  <p>
                    {account.nickname ||
                      accountText}
                  </p>

                  <h2 className="money">
                    {account.balance !=
                    null
                      ? show(
                          account.balance,
                        )
                      : '—'}
                  </h2>

                  <p className="transactions-account__meta">
                    {account.accountSubType ||
                      account.accountType ||
                      ''}

                    {account.identification
                      ? ` · ${account.identification}`
                      : ''}
                  </p>
                </Card>
              ),
            )}
          </section>

          <Card>
            <h3>
              {recentTransactionsText}
            </h3>

            {transactions.length ===
            0 ? (
              <p className="transactions-empty">
                {noTransactionsText}
              </p>
            ) : (
              <ul className="transactions-list">
                {transactions.map(
                  (txn) => (
                    <li
                      key={
                        txn.transactionId
                      }
                      className="transactions-list__item"
                    >
                      <div>
                        <p className="transactions-list__name">
                          {txn.merchant ||
                            txn.description}
                        </p>

                        <p className="transactions-list__date">
                          {formatDate(
                            txn.bookedAt,
                          )}
                        </p>
                      </div>

                      <span
                        className={`money transactions-amount ${
                          txn.direction ===
                          'credit'
                            ? 'transactions-amount--credit'
                            : ''
                        }`}
                      >
                        {txn.direction ===
                        'debit'
                          ? '−'
                          : '+'}

                        {show(
                          txn.amount,
                        )}
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}
          </Card>
        </>
      )}

      {manual.length > 0 && (
        <Card>
          <h3>
            {addedManuallyText}
          </h3>

          <ul className="transactions-list">
            {manual.map(
              (transaction) => (
                <li
                  key={transaction.id}
                  className="transactions-list__item"
                >
                  <div>
                    <p className="transactions-list__name">
                      {transaction.name}
                    </p>

                    <p className="transactions-list__date">
                      {transaction.date}

                      {transaction.category
                        ? ` · ${translateCategory(
                            transaction.category,
                          )}`
                        : ''}
                    </p>
                  </div>

                  <span className="transactions-list__manual">
                    <span className="money">
                      {show(
                        transaction.amount,
                      )}
                    </span>

                    <Link
                      className="transactions-list__edit"
                      to={`/transactions/${transaction.id}/edit`}
                    >
                      {editText}
                    </Link>
                  </span>
                </li>
              ),
            )}
          </ul>
        </Card>
      )}
    </AppShell>
  )
}

export default TransactionsPage