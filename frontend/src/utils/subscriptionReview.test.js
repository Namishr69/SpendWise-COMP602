import { describe, it, expect } from 'vitest'

import { isPendingReview, countsAsSubscription } from './subscriptionReview.js'

describe('subscription review state', () => {
  it('holds unreviewed email finds as pending', () => {
    expect(isPendingReview({ source: 'gmail-detected' })).toBe(true)
    expect(countsAsSubscription({ source: 'gmail-detected' })).toBe(false)
  })

  it('counts an email find once confirmed', () => {
    const confirmed = { source: 'gmail-detected', reviewStatus: 'confirmed' }
    expect(isPendingReview(confirmed)).toBe(false)
    expect(countsAsSubscription(confirmed)).toBe(true)
  })

  it('hides a rejected email find', () => {
    const rejected = { source: 'gmail-detected', reviewStatus: 'rejected' }
    expect(isPendingReview(rejected)).toBe(false)
    expect(countsAsSubscription(rejected)).toBe(false)
  })

  it('counts manual and bank-detected subscriptions straight away', () => {
    expect(isPendingReview({})).toBe(false)
    expect(countsAsSubscription({})).toBe(true)
    expect(isPendingReview({ source: 'anz-detected' })).toBe(false)
    expect(countsAsSubscription({ source: 'anz-detected' })).toBe(true)
  })
})
