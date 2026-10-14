// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom/vitest'

import PriceChangeAlerts from './PriceChangeAlerts.jsx'
import { getPriceAlerts, dismissPriceAlert } from '../api/priceAlertApi'

vi.mock('../api/priceAlertApi', () => ({
  getPriceAlerts: vi.fn(),
  dismissPriceAlert: vi.fn(),
}))

vi.mock('../context/subscriptionsContext', () => ({
  useSubscriptions: () => ({ getSubscription: () => null }),
}))

vi.mock('../hooks/useCurrencyRate.js', () => ({
  useCurrencyRate: () => ({ preferredCurrency: 'NZD', rate: 1 }),
}))

const announcement = {
  id: 'sub1_announced_1799_2026-11-01',
  type: 'announcement',
  subscriptionId: 'sub1',
  subscriptionName: 'Netflix',
  previousAmount: 15.99,
  newAmount: 17.99,
  effectiveDate: '2026-11-01',
}

function renderAlerts(props = {}) {
  return render(
    <MemoryRouter>
      <PriceChangeAlerts {...props} />
    </MemoryRouter>,
  )
}

describe('PriceChangeAlerts with a provider announcement', () => {
  beforeEach(() => {
    getPriceAlerts.mockResolvedValue([announcement])
    dismissPriceAlert.mockResolvedValue({ ...announcement, dismissed: true })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows the subscription name, current price, new price and effective date', async () => {
    renderAlerts()

    expect(await screen.findByText('Netflix')).toBeInTheDocument()
    expect(screen.getByText(/is changing its price/i)).toBeInTheDocument()
    expect(screen.getByText('$15.99')).toBeInTheDocument()
    expect(screen.getByText('$17.99')).toBeInTheDocument()
    expect(screen.getByText(/takes effect 1 Nov 2026/i)).toBeInTheDocument()
  })

  it('labels the old price as the current price, not a past charge', async () => {
    renderAlerts()

    await screen.findByText('Netflix')

    expect(screen.getByText(/current/i)).toBeInTheDocument()
    expect(screen.queryByText(/charged/i)).not.toBeInTheDocument()
  })

  it('says when the email did not give a date', async () => {
    getPriceAlerts.mockResolvedValue([{ ...announcement, effectiveDate: null }])

    renderAlerts()

    expect(await screen.findByText(/start date not given/i)).toBeInTheDocument()
  })

  it('shows the announcement on a subscription detail page', async () => {
    renderAlerts({ subscriptionId: 'sub1' })

    expect(await screen.findByText(/is changing its price/i)).toBeInTheDocument()
    expect(getPriceAlerts).toHaveBeenCalledWith('sub1')
  })

  it('removes the notification when the user dismisses it', async () => {
    renderAlerts()

    fireEvent.click(
      await screen.findByRole('button', {
        name: /dismiss price change alert for netflix/i,
      }),
    )

    expect(dismissPriceAlert).toHaveBeenCalledWith(announcement.id)
    expect(screen.queryByText('Netflix')).not.toBeInTheDocument()
  })
})
