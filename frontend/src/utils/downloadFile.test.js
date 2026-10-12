// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadCsv } from './downloadFile.js'

describe('downloadCsv', () => {
  let createObjectURL
  let revokeObjectURL
  let clickSpy

  beforeEach(() => {
    createObjectURL = vi.fn(() => 'blob:mock-url')
    revokeObjectURL = vi.fn()
    clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('downloads the CSV text as a text/csv blob', () => {
    downloadCsv('Name,Amount\nNetflix,19.99', 'subscriptions.csv')

    expect(createObjectURL).toHaveBeenCalledTimes(1)

    const blob = createObjectURL.mock.calls[0][0]
    expect(blob.type).toBe('text/csv;charset=utf-8;')

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('names the downloaded file', () => {
    let anchor

    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      anchor = node
      return node
    })
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})

    downloadCsv('a,b', 'subscriptions.csv')

    expect(anchor).toBeDefined()
    expect(anchor.download).toBe('subscriptions.csv')
  })
})
