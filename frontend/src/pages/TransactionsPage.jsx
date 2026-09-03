import { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import { AuthContext } from '../context/AuthProvider'
import { CurrencyContext } from '../context/CurrencyProvider'
import { getTransactions } from '../api/transactionApi'
import { convertCurrency } from '../api/exchangeRateApi'
import { formatCurrency } from '../utils/formatCurrency'
import './SubscriptionsPage.css'

function TransactionsPage() {
  const { currentUser } = useContext(AuthContext)
  const { preferredCurrency } = useContext(CurrencyContext)

  const [transactions, setTransactions] = useState([])
  const [displayTransactions, setDisplayTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadTransactions() {
      try {
        const data = await getTransactions(currentUser)
        setTransactions(data)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    if (currentUser) {
      loadTransactions()
    }
  }, [currentUser])

  useEffect(() => {
    async function convertTransactions() {
      try {
        const converted = await Promise.all(
          transactions.map(async (transaction) => {
            const originalCurrency =
              transaction.currency || 'NZD'

            const convertedAmount = await convertCurrency(
              transaction.amount,
              originalCurrency,
              preferredCurrency
            )

            return {
              ...transaction,
              displayAmount: convertedAmount,
            }
          })
        )

        setDisplayTransactions(converted)
      } catch (err) {
        console.error(
          'Transaction currency conversion failed:',
          err
        )

        setDisplayTransactions(
          transactions.map((transaction) => ({
            ...transaction,
            displayAmount: transaction.amount,
          }))
        )
      }
    }

    if (transactions.length > 0) {
      convertTransactions()
    } else {
      setDisplayTransactions([])
    }
  }, [transactions, preferredCurrency])

  if (loading) {
    return (
      <AppShell
        activeNav="Transactions"
        hideTopbarTitle
      >
        <p>Loading transactions...</p>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell
        activeNav="Transactions"
        hideTopbarTitle
      >
        <p>
          Could not load transactions: {error.message}
        </p>
      </AppShell>
    )
  }

  return (
    <AppShell
      activeNav="Transactions"
      hideTopbarTitle
    >
      <header className="subscriptions-header">
        <div>
          <p className="subscriptions-eyebrow">
            SpendWise
          </p>

          <h1>Transactions</h1>

          <p>
            View and manage your spending.
          </p>
        </div>

        <Link
          className="subscriptions-add"
          to="/transactions/new"
        >
          + Add transaction
        </Link>
      </header>

      {displayTransactions.length === 0 ? (
        <p>No transactions yet.</p>
      ) : (
        <section className="subscriptions-grid">
          {displayTransactions.map((transaction) => (
            <Card
              key={transaction.id}
              className="subscription-card"
            >
              <div>
                <h2>{transaction.name}</h2>

                <p>
                  {formatCurrency(
                    transaction.displayAmount,
                    preferredCurrency
                  )}
                </p>

                <p>
                  Date: {transaction.date}
                </p>

                <p>
                  Category: {transaction.category}
                </p>

                <p>
                  Source: Manual
                </p>
              </div>

              <Link
                className="subscription-link"
                to={`/transactions/${transaction.id}/edit`}
              >
                Edit transaction
              </Link>
            </Card>
          ))}
        </section>
      )}
    </AppShell>
  )
}

export default TransactionsPage