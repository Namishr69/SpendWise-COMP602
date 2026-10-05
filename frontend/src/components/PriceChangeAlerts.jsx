import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import Card from './ui/Card'
import Button from './ui/Button'
import { useSubscriptions } from '../context/subscriptionsContext'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { getPriceAlerts, dismissPriceAlert } from '../api/priceAlertApi'

import './PriceChangeAlerts.css'

function formatDate(isoDate) {
  if (!isoDate) return ''

  // Payment dates are plain YYYY-MM-DD, so read them as local dates.
  const date = new Date(`${isoDate}T00:00:00`)

  if (Number.isNaN(date.getTime())) return isoDate

  return date.toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Lists undismissed price change alerts: every subscription's on the
 * dashboard, or one subscription's when subscriptionId is given. Renders
 * nothing when there are none. Bump refreshKey to re-fetch, e.g. after a
 * payment is added.
 */
function PriceChangeAlerts({ subscriptionId, refreshKey = 0 }) {
  const { getSubscription } = useSubscriptions()
  const { preferredCurrency, rate } = useCurrencyRate()

  const [alerts, setAlerts] = useState([])
  const [error, setError] = useState('')

  const showMoney = (amount) =>
    formatCurrency(
      (Number(amount) || 0) * rate,
      preferredCurrency,
    )

  useEffect(() => {
    let cancelled = false

    async function loadAlerts() {
      try {
        const data = await getPriceAlerts(subscriptionId)

        if (!cancelled) {
          setAlerts(data)
          setError('')
        }
      } catch {
        if (!cancelled) {
          setAlerts([])
        }
      }
    }

    loadAlerts()

    return () => {
      cancelled = true
    }
  }, [subscriptionId, refreshKey])

  async function handleDismiss(alert) {
    setError('')
    setAlerts((current) =>
      current.filter((item) => item.id !== alert.id),
    )

    try {
      await dismissPriceAlert(alert.id)
    } catch (err) {
      setAlerts((current) => [alert, ...current])
      setError(err.message)
    }
  }

  if (alerts.length === 0 && !error) {
    return null
  }

  return (
    <Card className="price-alerts">
      <h3>
        Price change{alerts.length === 1 ? '' : 's'} detected
      </h3>

      {error && (
        <p className="price-alerts__error">
          Could not dismiss alert: {error}
        </p>
      )}

      <ul className="price-alerts__list">
        {alerts.map((alert) => {
          const name =
            getSubscription(alert.subscriptionId)?.name ||
            alert.subscriptionName
          const difference =
            alert.newAmount - alert.previousAmount
          const increased = difference > 0

          return (
            <li
              key={alert.id}
              className={`price-alerts__item price-alerts__item--${
                increased ? 'up' : 'down'
              }`}
            >
              <div className="price-alerts__body">
                <p className="price-alerts__title">
                  {subscriptionId ? (
                    name
                  ) : (
                    <Link
                      to={`/subscriptions/${alert.subscriptionId}`}
                    >
                      {name}
                    </Link>
                  )}{' '}
                  charged {increased ? 'more' : 'less'} than
                  usual
                </p>

                <p className="price-alerts__amounts">
                  <span>
                    Previous{' '}
                    <strong>
                      {showMoney(alert.previousAmount)}
                    </strong>
                  </span>

                  <span aria-hidden="true">→</span>

                  <span>
                    New{' '}
                    <strong>
                      {showMoney(alert.newAmount)}
                    </strong>
                  </span>

                  <span className="price-alerts__diff">
                    {increased ? '+' : '−'}
                    {showMoney(Math.abs(difference))}
                  </span>
                </p>

                <p className="price-alerts__meta">
                  Charged {formatDate(alert.paymentDate)}
                  {alert.source === 'anz-detected'
                    ? ' · from your bank'
                    : ''}
                </p>
              </div>

              <Button
                variant="secondary"
                onClick={() => handleDismiss(alert)}
                aria-label={`Dismiss price change alert for ${name}`}
              >
                Dismiss
              </Button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export default PriceChangeAlerts
