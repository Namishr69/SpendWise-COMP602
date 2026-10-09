import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import AppShell from '../layouts/AppShell'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import SubscriptionNotes from '../components/SubscriptionNotes'
import { useSubscriptions } from '../context/subscriptionsContext'
import { useCurrencyRate } from '../hooks/useCurrencyRate.js'
import { formatCurrency } from '../utils/formatCurrency.js'
import { getPayments, createPayment } from '../api/subscriptionApi'

import './SubscriptionDetailPage.css'

function localToday() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}

function localDateFromISO(iso) {
  if (!iso) return ''

  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) return ''

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

function SubscriptionDetailPage() {
  const { subscriptionId } = useParams()

  const {
    loading,
    getSubscription,
    updateSubscription,
  } = useSubscriptions()

  const subscription = getSubscription(subscriptionId)

  const { preferredCurrency, rate } = useCurrencyRate()

  const showMoney = (amount) =>
    formatCurrency(
      (Number(amount) || 0) * rate,
      preferredCurrency
    )

  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [paymentDate, setPaymentDate] = useState(localToday())
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [adding, setAdding] = useState(false)

  // Device management state.
  const [managingDevices, setManagingDevices] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [deviceError, setDeviceError] = useState('')
  const [editingDeviceIndex, setEditingDeviceIndex] = useState(null)
  const [editingDeviceName, setEditingDeviceName] = useState('')
  const [savingDevice, setSavingDevice] = useState(false)

  useEffect(() => {
    if (!subscription) return

    let cancelled = false

    async function loadPayments() {
      try {
        const data = await getPayments(subscription.id)

        if (!cancelled) {
          setPayments(data)
        }
      } catch {
        if (!cancelled) {
          setPayments([])
        }
      } finally {
        if (!cancelled) {
          setPaymentsLoading(false)
        }
      }
    }

    loadPayments()

    return () => {
      cancelled = true
    }
  }, [subscription])

  if (loading) {
    return (
      <AppShell activeNav="Subscriptions">
        <p>Loading subscription…</p>
      </AppShell>
    )
  }

  if (!subscription) {
    return (
      <AppShell activeNav="Subscriptions">
        <h1>Subscription not found</h1>

        <Link to="/subscriptions">
          Back to subscriptions
        </Link>
      </AppShell>
    )
  }

  const totalSpent = payments.reduce(
    (total, payment) =>
      total + (Number(payment.amount) || 0),
    0
  )

  // Older subscriptions may not have a devices field.
  const devices = Array.isArray(subscription.devices)
    ? subscription.devices
    : []

  async function handleAddPayment(event) {
    event.preventDefault()

    const amount = Number(paymentAmount)

    if (!paymentDate) {
      setPaymentError('Enter a payment date.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Enter an amount greater than zero.')
      return
    }

    setAdding(true)
    setPaymentError('')

    try {
      const created = await createPayment(
        subscription.id,
        {
          date: paymentDate,
          amount,
        }
      )

      setPayments((current) => [
        created,
        ...current,
      ])

      setPaymentDate(localToday())
      setPaymentAmount('')
    } catch (err) {
      setPaymentError(err.message)
    } finally {
      setAdding(false)
    }
  }

  function handleManageDevices() {
    setManagingDevices(true)
    setDeviceError('')
  }

  function handleDoneManagingDevices() {
    setManagingDevices(false)
    setEditingDeviceIndex(null)
    setEditingDeviceName('')
    setDeviceName('')
    setDeviceError('')
  }

  async function handleAddDevice(event) {
    event.preventDefault()

    const trimmedName = deviceName.trim()

    if (!trimmedName) {
      setDeviceError('Enter a device name.')
      return
    }

    setSavingDevice(true)
    setDeviceError('')

    try {
      const updatedDevices = [
        ...devices,
        trimmedName,
      ]

      await updateSubscription(
        subscription.id,
        {
          devices: updatedDevices,
        }
      )

      setDeviceName('')
    } catch (err) {
      setDeviceError(
        err.message || 'Failed to add device.'
      )
    } finally {
      setSavingDevice(false)
    }
  }

  function handleStartEditDevice(index) {
    setEditingDeviceIndex(index)
    setEditingDeviceName(devices[index])
    setDeviceError('')
  }

  function handleCancelEditDevice() {
    setEditingDeviceIndex(null)
    setEditingDeviceName('')
    setDeviceError('')
  }

  async function handleSaveDevice(index) {
    const trimmedName = editingDeviceName.trim()

    if (!trimmedName) {
      setDeviceError('Enter a device name.')
      return
    }

    setSavingDevice(true)
    setDeviceError('')

    try {
      const updatedDevices = [...devices]
      updatedDevices[index] = trimmedName

      await updateSubscription(
        subscription.id,
        {
          devices: updatedDevices,
        }
      )

      setEditingDeviceIndex(null)
      setEditingDeviceName('')
    } catch (err) {
      setDeviceError(
        err.message || 'Failed to update device.'
      )
    } finally {
      setSavingDevice(false)
    }
  }

  async function handleDeleteDevice(index) {
    setSavingDevice(true)
    setDeviceError('')

    try {
      const updatedDevices = devices.filter(
        (_, deviceIndex) =>
          deviceIndex !== index
      )

      await updateSubscription(
        subscription.id,
        {
          devices: updatedDevices,
        }
      )

      if (editingDeviceIndex === index) {
        setEditingDeviceIndex(null)
        setEditingDeviceName('')
      }
    } catch (err) {
      setDeviceError(
        err.message || 'Failed to delete device.'
      )
    } finally {
      setSavingDevice(false)
    }
  }

  return (
    <AppShell activeNav="Subscriptions">
      <div className="detail-actions">
        <Link to="/subscriptions">
          ← Back to subscriptions
        </Link>

        <Link
          className="edit-subscription-link"
          to={`/subscriptions/${subscription.id}/edit`}
        >
          Edit subscription
        </Link>
      </div>

      <header className="detail-header">
        <h1>{subscription.name}</h1>

        <p>
          {showMoney(subscription.amount)} /{' '}
          {subscription.billingCycle.toLowerCase()}
        </p>
      </header>

      <section className="detail-summary">
        <Card>
          <h2>Total spent</h2>

          <p className="detail-total">
            {showMoney(totalSpent)}
          </p>
        </Card>

        <Card>
          <h2>Next payment</h2>

          <p>
            {subscription.nextPaymentDate || 'Not set'}
          </p>
        </Card>

        <Card>
          <h2>Subscription date</h2>

          <p>
            {subscription.subscriptionDate ||
              localDateFromISO(
                subscription.createdAt
              ) ||
              'Not set'}
          </p>
        </Card>

        <Card>
          <h2>Status</h2>
          <p>{subscription.status}</p>
        </Card>
      </section>

      <Card className="subscription-devices">
        <div className="device-header">
          <h2>Devices</h2>

          {!managingDevices ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleManageDevices}
            >
              Manage
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={savingDevice}
              onClick={handleDoneManagingDevices}
            >
              Done
            </Button>
          )}
        </div>

        {deviceError && (
          <p className="device-error">
            {deviceError}
          </p>
        )}

        {!managingDevices ? (
          <>
            {devices.length === 0 ? (
              <p className="device-empty">
                No devices are currently connected.
              </p>
            ) : (
              <div className="device-tags">
                {devices.map((device, index) => (
                  <span
                    className="device-tag"
                    key={`${device}-${index}`}
                  >
                    {device}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="device-manager">
            {devices.length === 0 ? (
              <p className="device-empty">
                No devices are currently connected.
              </p>
            ) : (
              <div className="device-manage-list">
                {devices.map((device, index) => (
                  <div
                    className="device-manage-item"
                    key={`${device}-${index}`}
                  >
                    {editingDeviceIndex === index ? (
                      <div className="device-edit-row">
                        <div className="device-edit-input">
                          <Input
                            id={`edit-device-${index}`}
                            label="Device name"
                            type="text"
                            value={editingDeviceName}
                            onChange={(event) =>
                              setEditingDeviceName(
                                event.target.value
                              )
                            }
                          />
                        </div>

                        <div className="device-item-actions">
                          <Button
                            type="button"
                            variant="primary"
                            disabled={savingDevice}
                            onClick={() =>
                              handleSaveDevice(index)
                            }
                          >
                            {savingDevice
                              ? 'Saving…'
                              : 'Save'}
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            disabled={savingDevice}
                            onClick={handleCancelEditDevice}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="device-manage-name">
                          {device}
                        </span>

                        <div className="device-item-actions">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={savingDevice}
                            onClick={() =>
                              handleStartEditDevice(index)
                            }
                          >
                            Edit
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            disabled={savingDevice}
                            onClick={() =>
                              handleDeleteDevice(index)
                            }
                          >
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            <form
              className="add-device-form"
              onSubmit={handleAddDevice}
              noValidate
            >
              <h3>Add device</h3>

              <div className="add-device-controls">
                <div className="add-device-input">
                  <Input
                    id="device-name"
                    label="Device name"
                    type="text"
                    value={deviceName}
                    onChange={(event) =>
                      setDeviceName(event.target.value)
                    }
                  />
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  disabled={savingDevice}
                >
                  {savingDevice
                    ? 'Saving…'
                    : 'Add device'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>

      <SubscriptionNotes
        notes={subscription.notes}
        onSave={async (text) => {
          await updateSubscription(
            subscription.id,
            { notes: text }
          )
        }}
        onDelete={async () => {
          await updateSubscription(
            subscription.id,
            { notes: '' }
          )
        }}
      />

      <Card className="payment-history">
        <h2>Payment history</h2>

        {paymentsLoading ? (
          <p>Loading payment history…</p>
        ) : payments.length === 0 ? (
          <p>No payment history is available.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th scope="col">
                  Payment date
                </th>

                <th scope="col">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    {payment.date}
                  </td>

                  <td>
                    {showMoney(payment.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form
          className="add-payment-form"
          onSubmit={handleAddPayment}
          noValidate
        >
          <h3>Add payment</h3>

          {paymentError && (
            <p className="add-payment-error">
              {paymentError}
            </p>
          )}

          <Input
            id="payment-date"
            label="Payment date"
            type="date"
            value={paymentDate}
            onChange={(event) =>
              setPaymentDate(event.target.value)
            }
          />

          <Input
            id="payment-amount"
            label={`Amount (${preferredCurrency})`}
            type="number"
            min="0.01"
            step="0.01"
            value={paymentAmount}
            onChange={(event) =>
              setPaymentAmount(event.target.value)
            }
          />

          <Button
            type="submit"
            disabled={adding}
          >
            {adding
              ? 'Adding…'
              : 'Add payment'}
          </Button>
        </form>
      </Card>
    </AppShell>
  )
}

export default SubscriptionDetailPage