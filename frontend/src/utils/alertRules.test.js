import { describe, it, expect } from 'vitest'

import {
  daysUntil,
  classifySubscriptionAlerts,
} from './alertRules.js'

// Local noon on 20 Oct 2026, so time zones can't shift the day.
const NOW = new Date(2026, 9, 20, 12)

describe('daysUntil', () => {
  it('counts whole days from today, negative once passed', () => {
    expect(daysUntil('2026-10-20', NOW)).toBe(0)
    expect(daysUntil('2026-10-23', NOW)).toBe(3)
    expect(daysUntil('2026-10-18', NOW)).toBe(-2)
  })

  it('reads the date part of an ISO timestamp', () => {
    expect(daysUntil('2026-10-21T00:00:00.000Z', NOW)).toBe(1)
  })

  it('returns null for a missing or unreadable date', () => {
    expect(daysUntil('', NOW)).toBe(null)
    expect(daysUntil(undefined, NOW)).toBe(null)
    expect(daysUntil('soon', NOW)).toBe(null)
  })
})

describe('classifySubscriptionAlerts', () => {
  const kinds = (subscriptions) =>
    classifySubscriptionAlerts(subscriptions, NOW).map(
      (alert) => `${alert.subscription.id}:${alert.kind}:${alert.level}`,
    )

  it('flags a bank payment 2+ days overdue as possibly failed (red)', () => {
    expect(
      kinds([
        { id: 'a', source: 'anz-detected', nextPaymentDate: '2026-10-18' },
        { id: 'b', source: 'anz-detected', nextPaymentDate: '2026-10-19' },
      ]),
    ).toEqual(['a:overdue:red'])
  })

  it('never calls a manual or email payment failed, since their dates are not kept current', () => {
    expect(
      kinds([
        { id: 'm', nextPaymentDate: '2026-10-01' },
        { id: 'e', source: 'gmail-detected', nextPaymentDate: '2026-10-01' },
      ]),
    ).toEqual([])
  })

  it('warns about a free trial ending within 7 days (orange)', () => {
    expect(
      kinds([
        { id: 't0', isTrial: true, trialEndDate: '2026-10-20' },
        { id: 't7', isTrial: true, trialEndDate: '2026-10-27' },
        { id: 't8', isTrial: true, trialEndDate: '2026-10-28' },
        { id: 'ended', isTrial: true, trialEndDate: '2026-10-19' },
        { id: 'notTrial', isTrial: false, trialEndDate: '2026-10-21' },
      ]),
    ).toEqual(['t0:trialEnding:orange', 't7:trialEnding:orange'])
  })

  it('reminds about a payment due within 3 days (blue)', () => {
    expect(
      kinds([
        { id: 'd0', nextPaymentDate: '2026-10-20' },
        { id: 'd3', nextPaymentDate: '2026-10-23' },
        { id: 'd4', nextPaymentDate: '2026-10-24' },
      ]),
    ).toEqual(['d0:dueSoon:blue', 'd3:dueSoon:blue'])
  })

  it('gives each subscription only its most urgent alert', () => {
    expect(
      kinds([
        {
          id: 'x',
          isTrial: true,
          trialEndDate: '2026-10-22',
          nextPaymentDate: '2026-10-22',
        },
      ]),
    ).toEqual(['x:trialEnding:orange'])
  })

  it('skips paused and cancelled subscriptions', () => {
    expect(
      kinds([
        { id: 'p', status: 'Paused', nextPaymentDate: '2026-10-21' },
        {
          id: 'c',
          status: 'Cancelled',
          source: 'anz-detected',
          nextPaymentDate: '2026-10-01',
        },
      ]),
    ).toEqual([])
  })
})
