import { describe, it, expect } from 'vitest'
import {
  calculateMonthSpend,
  calculateSubscriptionTotalForMonth,
  compareMonthToPrevious,
} from './monthlySpend.js'

describe('calculateMonthSpend', () => {
  it('calculates spending for the selected month', () => {
    const transactions = [
      {
        amount: 100,
        direction: 'debit',
        bookedAt: '2026-10-05T12:00:00',
      },
      {
        amount: 50,
        direction: 'debit',
        bookedAt: '2026-10-15T12:00:00',
      },
      {
        amount: 75,
        direction: 'debit',
        bookedAt: '2026-09-20T12:00:00',
      },
    ]

    expect(calculateMonthSpend(transactions, 2026, 9)).toBe(150)
  })

  it('excludes credit transactions', () => {
    const transactions = [
      {
        amount: 100,
        direction: 'debit',
        bookedAt: '2026-10-05T12:00:00',
      },
      {
        amount: 50,
        direction: 'credit',
        bookedAt: '2026-10-10T12:00:00',
      },
    ]

    expect(calculateMonthSpend(transactions, 2026, 9)).toBe(100)
  })

  it('includes manually added transactions without a direction', () => {
    const transactions = [
      {
        amount: 80,
        date: '2026-10-05T12:00:00',
      },
    ]

    expect(calculateMonthSpend(transactions, 2026, 9)).toBe(80)
  })

  it('uses bookedAt when both bookedAt and date are provided', () => {
    const transactions = [
      {
        amount: 100,
        bookedAt: '2026-10-05T12:00:00',
        date: '2026-09-05T12:00:00',
      },
    ]

    expect(calculateMonthSpend(transactions, 2026, 9)).toBe(100)
    expect(calculateMonthSpend(transactions, 2026, 8)).toBe(0)
  })

  it('uses date when bookedAt is not available', () => {
    const transactions = [
      {
        amount: 100,
        date: '2026-10-05T12:00:00',
      },
    ]

    expect(calculateMonthSpend(transactions, 2026, 9)).toBe(100)
  })

  it('handles negative transaction amounts using their absolute value', () => {
    const transactions = [
      {
        amount: -100,
        direction: 'debit',
        bookedAt: '2026-10-05T12:00:00',
      },
    ]

    expect(calculateMonthSpend(transactions, 2026, 9)).toBe(100)
  })

  it('ignores transactions with invalid or missing dates', () => {
    const transactions = [
      {
        amount: 100,
        direction: 'debit',
        bookedAt: 'not-a-date',
      },
      {
        amount: 50,
        direction: 'debit',
      },
      {
        amount: 25,
        direction: 'debit',
        bookedAt: '2026-10-05T12:00:00',
      },
    ]

    expect(calculateMonthSpend(transactions, 2026, 9)).toBe(25)
  })

  it('treats non-numeric amounts as zero', () => {
    const transactions = [
      {
        amount: 'invalid',
        direction: 'debit',
        bookedAt: '2026-10-05T12:00:00',
      },
      {
        amount: 50,
        direction: 'debit',
        bookedAt: '2026-10-05T12:00:00',
      },
    ]

    expect(calculateMonthSpend(transactions, 2026, 9)).toBe(50)
  })
})

describe('calculateSubscriptionTotalForMonth', () => {
  it('calculates the monthly amount for an active subscription', () => {
    const subscriptions = [
      {
        id: 'netflix',
        amount: 20,
        billingCycle: 'monthly',
        status: 'Active',
        createdAt: '2026-09-01T12:00:00',
      },
    ]

    expect(
      calculateSubscriptionTotalForMonth(
        subscriptions,
        {},
        2026,
        9
      )
    ).toBe(20)
  })

  it('excludes inactive subscriptions when there is no payment', () => {
    const subscriptions = [
      {
        id: 'netflix',
        amount: 20,
        billingCycle: 'monthly',
        status: 'Cancelled',
        createdAt: '2026-09-01T12:00:00',
      },
    ]

    expect(
      calculateSubscriptionTotalForMonth(
        subscriptions,
        {},
        2026,
        9
      )
    ).toBe(0)
  })

  it('excludes subscriptions created after the selected month', () => {
    const subscriptions = [
      {
        id: 'netflix',
        amount: 20,
        billingCycle: 'monthly',
        status: 'Active',
        createdAt: '2026-11-01T12:00:00',
      },
    ]

    expect(
      calculateSubscriptionTotalForMonth(
        subscriptions,
        {},
        2026,
        9
      )
    ).toBe(0)
  })

  it('includes an active subscription with no createdAt date', () => {
    const subscriptions = [
      {
        id: 'netflix',
        amount: 20,
        billingCycle: 'monthly',
        status: 'Active',
      },
    ]

    expect(
      calculateSubscriptionTotalForMonth(
        subscriptions,
        {},
        2026,
        9
      )
    ).toBe(20)
  })

  it('uses an actual payment instead of the estimated subscription amount', () => {
    const subscriptions = [
      {
        id: 'netflix',
        amount: 20,
        billingCycle: 'monthly',
        status: 'Active',
        createdAt: '2026-09-01T12:00:00',
      },
    ]

    const payments = {
      netflix: [
        {
          amount: 25,
          date: '2026-10-05T12:00:00',
        },
      ],
    }

    expect(
      calculateSubscriptionTotalForMonth(
        subscriptions,
        payments,
        2026,
        9
      )
    ).toBe(25)
  })

  it('adds multiple actual payments in the same month', () => {
    const subscriptions = [
      {
        id: 'subscription-1',
        amount: 20,
        billingCycle: 'monthly',
        status: 'Active',
        createdAt: '2026-09-01T12:00:00',
      },
    ]

    const payments = {
      'subscription-1': [
        {
          amount: 10,
          date: '2026-10-05T12:00:00',
        },
        {
          amount: 15,
          date: '2026-10-15T12:00:00',
        },
      ],
    }

    expect(
      calculateSubscriptionTotalForMonth(
        subscriptions,
        payments,
        2026,
        9
      )
    ).toBe(25)
  })

  it('counts a real payment even if the subscription is now cancelled', () => {
    const subscriptions = [
      {
        id: 'subscription-1',
        amount: 20,
        billingCycle: 'monthly',
        status: 'Cancelled',
        createdAt: '2026-08-01T12:00:00',
      },
    ]

    const payments = {
      'subscription-1': [
        {
          amount: 20,
          date: '2026-10-05T12:00:00',
        },
      ],
    }

    expect(
      calculateSubscriptionTotalForMonth(
        subscriptions,
        payments,
        2026,
        9
      )
    ).toBe(20)
  })

  it('does not count payments from a different month', () => {
    const subscriptions = [
      {
        id: 'subscription-1',
        amount: 20,
        billingCycle: 'monthly',
        status: 'Active',
        createdAt: '2026-08-01T12:00:00',
      },
    ]

    const payments = {
      'subscription-1': [
        {
          amount: 30,
          date: '2026-09-05T12:00:00',
        },
      ],
    }

    expect(
      calculateSubscriptionTotalForMonth(
        subscriptions,
        payments,
        2026,
        9
      )
    ).toBe(20)
  })

  it('supports case-insensitive Active status', () => {
    const subscriptions = [
      {
        id: 'subscription-1',
        amount: 20,
        billingCycle: 'monthly',
        status: 'ACTIVE',
        createdAt: '2026-10-01T12:00:00',
      },
    ]

    expect(
      calculateSubscriptionTotalForMonth(
        subscriptions,
        {},
        2026,
        9
      )
    ).toBe(20)
  })
})

describe('compareMonthToPrevious', () => {
  it('compares current month spending with the previous month', () => {
    const transactions = [
      {
        amount: 300,
        direction: 'debit',
        bookedAt: '2026-10-05T12:00:00',
      },
      {
        amount: 200,
        direction: 'debit',
        bookedAt: '2026-09-05T12:00:00',
      },
    ]

    const result = compareMonthToPrevious(
      transactions,
      [],
      {},
      new Date(2026, 9, 5, 12)
    )

    expect(result.currentMonth).toBe(300)
    expect(result.previousMonth).toBe(200)
    expect(result.percentChange).toBe(50)
    expect(result.isIncrease).toBe(true)
  })

  it('identifies when spending has decreased', () => {
    const transactions = [
      {
        amount: 100,
        direction: 'debit',
        bookedAt: '2026-10-05T12:00:00',
      },
      {
        amount: 200,
        direction: 'debit',
        bookedAt: '2026-09-05T12:00:00',
      },
    ]

    const result = compareMonthToPrevious(
      transactions,
      [],
      {},
      new Date(2026, 9, 5, 12)
    )

    expect(result.currentMonth).toBe(100)
    expect(result.previousMonth).toBe(200)
    expect(result.percentChange).toBe(-50)
    expect(result.isIncrease).toBe(false)
  })

  it('returns null percentage change when previous spending is zero', () => {
    const transactions = [
      {
        amount: 100,
        direction: 'debit',
        bookedAt: '2026-10-05T12:00:00',
      },
    ]

    const result = compareMonthToPrevious(
      transactions,
      [],
      {},
      new Date(2026, 9, 5, 12)
    )

    expect(result.currentMonth).toBe(100)
    expect(result.previousMonth).toBe(0)
    expect(result.percentChange).toBe(null)
    expect(result.isIncrease).toBe(true)
  })

  it('handles January by comparing against December of the previous year', () => {
    const transactions = [
      {
        amount: 300,
        direction: 'debit',
        bookedAt: '2026-01-05T12:00:00',
      },
      {
        amount: 200,
        direction: 'debit',
        bookedAt: '2025-12-05T12:00:00',
      },
    ]

    const result = compareMonthToPrevious(
      transactions,
      [],
      {},
      new Date(2026, 0, 5, 12)
    )

    expect(result.currentMonth).toBe(300)
    expect(result.previousMonth).toBe(200)
    expect(result.percentChange).toBe(50)
    expect(result.isIncrease).toBe(true)
  })

  it('includes subscription spending in the comparison', () => {
    const transactions = [
      {
        amount: 100,
        direction: 'debit',
        bookedAt: '2026-10-05T12:00:00',
      },
      {
        amount: 50,
        direction: 'debit',
        bookedAt: '2026-09-05T12:00:00',
      },
    ]

    const subscriptions = [
      {
        id: 'subscription-1',
        amount: 20,
        billingCycle: 'monthly',
        status: 'Active',
        createdAt: '2026-09-01T12:00:00',
      },
    ]

    const result = compareMonthToPrevious(
      transactions,
      subscriptions,
      {},
      new Date(2026, 9, 5, 12)
    )

    expect(result.currentMonth).toBe(120)
    expect(result.previousMonth).toBe(70)
  })
})