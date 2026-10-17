import { describe, expect, it } from 'vitest'
import { buildSubscriptionsCsv } from './subscriptionsCsv.js'

const HEADER = 'Name,Amount,Payment Frequency,Next Renewal Date'

describe('buildSubscriptionsCsv', () => {
  it('returns only the header row when there are no subscriptions', () => {
    expect(buildSubscriptionsCsv([])).toBe(HEADER)
  })

  it('writes one row per subscription with the expected columns', () => {
    const subscriptions = [
      {
        name: 'Netflix',
        amount: 19.99,
        billingCycle: 'Monthly',
        nextPaymentDate: '2026-11-01',
      },
      {
        name: 'Adobe Creative Cloud',
        amount: 79.98,
        billingCycle: 'Yearly',
        nextPaymentDate: '2027-02-10',
      },
    ]

    expect(buildSubscriptionsCsv(subscriptions)).toBe(
      [
        HEADER,
        'Netflix,19.99,Monthly,2026-11-01',
        'Adobe Creative Cloud,79.98,Yearly,2027-02-10',
      ].join('\n'),
    )
  })

  it('quotes fields that contain commas, quotes, or line breaks', () => {
    const subscriptions = [
      {
        name: 'Hulu, Live "TV"',
        amount: 70,
        billingCycle: 'Monthly',
        nextPaymentDate: '2026-10-20',
      },
    ]

    expect(buildSubscriptionsCsv(subscriptions)).toBe(
      [
        HEADER,
        '"Hulu, Live ""TV""",70,Monthly,2026-10-20',
      ].join('\n'),
    )
  })

  it('leaves missing optional fields as empty cells', () => {
    const subscriptions = [
      {
        name: 'Gym',
        amount: 30,
        billingCycle: 'Monthly',
      },
    ]

    expect(buildSubscriptionsCsv(subscriptions)).toBe(
      [HEADER, 'Gym,30,Monthly,'].join('\n'),
    )
  })
})
