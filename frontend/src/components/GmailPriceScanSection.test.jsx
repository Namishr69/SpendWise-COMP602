// @vitest-environment jsdom

import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import GmailPriceScanSection from './GmailPriceScanSection.jsx'
import { requestGmailAccess } from '../utils/googleAuth.js'
import { scanGmailForPriceChanges } from '../api/priceAlertApi'

vi.mock('../utils/googleAuth.js', () => ({
  requestGmailAccess: vi.fn(),
}))

vi.mock('../api/priceAlertApi', () => ({
  scanGmailForPriceChanges: vi.fn(),
}))

function clickScan() {
  fireEvent.click(screen.getByRole('button', { name: /scan gmail/i }))
}

describe('GmailPriceScanSection', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('scans Gmail with the access token Google returns', async () => {
    requestGmailAccess.mockResolvedValue('gmail-token')
    scanGmailForPriceChanges.mockResolvedValue({
      scanned: 4,
      announcements: 1,
      created: [{ id: 'a1' }],
    })

    render(<GmailPriceScanSection />)
    clickScan()

    expect(await screen.findByText(/1 new price change found/i)).toBeInTheDocument()
    expect(scanGmailForPriceChanges).toHaveBeenCalledWith('gmail-token')
  })

  it('says so when no new price changes are found', async () => {
    requestGmailAccess.mockResolvedValue('gmail-token')
    scanGmailForPriceChanges.mockResolvedValue({
      scanned: 4,
      announcements: 0,
      created: [],
    })

    render(<GmailPriceScanSection />)
    clickScan()

    expect(await screen.findByText(/no new price changes/i)).toBeInTheDocument()
  })

  it('shows an error when the scan fails', async () => {
    requestGmailAccess.mockResolvedValue('gmail-token')
    scanGmailForPriceChanges.mockRejectedValue(
      new Error('Gmail access has expired. Connect Gmail again to scan.'),
    )

    render(<GmailPriceScanSection />)
    clickScan()

    expect(await screen.findByText(/gmail access has expired/i)).toBeInTheDocument()
  })

  it('stays quiet when the user closes the Google popup', async () => {
    const closed = Object.assign(new Error('Popup closed'), {
      code: 'auth/popup-closed-by-user',
    })
    requestGmailAccess.mockRejectedValue(closed)

    render(<GmailPriceScanSection />)
    clickScan()

    expect(await screen.findByRole('button', { name: /scan gmail/i })).toBeEnabled()
    expect(screen.queryByText(/popup closed/i)).not.toBeInTheDocument()
    expect(scanGmailForPriceChanges).not.toHaveBeenCalled()
  })
})
