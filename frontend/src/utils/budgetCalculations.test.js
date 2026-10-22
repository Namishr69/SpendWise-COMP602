import { describe, it, expect } from 'vitest'
import { calculateOverBudgetAmount } from './budgetCalculations.js'

describe('calculateOverBudgetAmount', () => {
  it('returns how much monthly spend is over a monthly budget', () => {
    const budget = { amount: 100, period: 'Monthly' }

    expect(calculateOverBudgetAmount(130, budget)).toBe(30)
  })

  it('compares against the monthly equivalent of a yearly budget', () => {
    const budget = { amount: 1200, period: 'Yearly' }

    expect(calculateOverBudgetAmount(150, budget)).toBe(50)
  })

  it('returns 0 when spend is at or under budget', () => {
    const budget = { amount: 100, period: 'Monthly' }

    expect(calculateOverBudgetAmount(100, budget)).toBe(0)
    expect(calculateOverBudgetAmount(80, budget)).toBe(0)
  })

  it('returns 0 when no budget is set', () => {
    expect(calculateOverBudgetAmount(500, null)).toBe(0)
    expect(calculateOverBudgetAmount(500, { amount: 0 })).toBe(0)
  })
})
