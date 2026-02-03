import {
  calculateProjections,
  aggregateByCategory,
  aggregateByDay,
  Projections,
  CategoryBreakdown,
  DailySpending,
} from '@/lib/spending-calculations'

describe('calculateProjections', () => {
  it('should return correct projections structure', () => {
    const result = calculateProjections(30000000, 15000000, 15, 15)

    expect(result).toHaveProperty('daysElapsed')
    expect(result).toHaveProperty('daysRemaining')
    expect(result).toHaveProperty('averageDailySpending')
    expect(result).toHaveProperty('projectedMonthEndSpending')
    expect(result).toHaveProperty('projectedRemainingBalance')
    expect(result).toHaveProperty('dailyBudgetRemaining')
  })

  it('should calculate average daily spending correctly', () => {
    const result = calculateProjections(30000000, 15000000, 15, 15)

    // 15,000,000 / 15 days = 1,000,000 per day
    expect(result.averageDailySpending).toBe(1000000)
  })

  it('should calculate projected month end spending correctly', () => {
    const result = calculateProjections(30000000, 15000000, 15, 15)

    // totalSpending (15M) + (averageDaily (1M) * daysRemaining (15)) = 30M
    expect(result.projectedMonthEndSpending).toBe(30000000)
  })

  it('should calculate projected remaining balance correctly', () => {
    const result = calculateProjections(30000000, 15000000, 15, 15)

    // salary (30M) - projectedMonthEnd (30M) = 0
    expect(result.projectedRemainingBalance).toBe(0)
  })

  it('should calculate daily budget remaining correctly', () => {
    const result = calculateProjections(30000000, 15000000, 15, 15)

    // remainingBalance (15M) / daysRemaining (15) = 1M per day
    expect(result.dailyBudgetRemaining).toBe(1000000)
  })

  it('should handle zero days elapsed', () => {
    const result = calculateProjections(30000000, 0, 0, 30)

    expect(result.averageDailySpending).toBe(0)
    expect(result.projectedMonthEndSpending).toBe(0)
    expect(result.projectedRemainingBalance).toBe(30000000)
    expect(result.dailyBudgetRemaining).toBe(1000000) // 30M / 30 days
  })

  it('should handle zero days remaining', () => {
    const result = calculateProjections(30000000, 25000000, 30, 0)

    expect(result.dailyBudgetRemaining).toBe(0)
  })

  it('should handle overspending scenario', () => {
    const result = calculateProjections(30000000, 35000000, 15, 15)

    // Already overspent
    expect(result.projectedRemainingBalance).toBeLessThan(0)
    expect(result.dailyBudgetRemaining).toBeLessThan(0)
  })
})

describe('aggregateByCategory', () => {
  const mockTransactions = [
    { category: 'Food', idrAmount: 1000000, amount: 1000000, currency: 'IDR' },
    { category: 'Food', idrAmount: 500000, amount: 500000, currency: 'IDR' },
    { category: 'Transport', idrAmount: 200000, amount: 200000, currency: 'IDR' },
    { category: 'Transfer', idrAmount: 5000000, amount: 5000000, currency: 'IDR' },
    { category: 'Shopping', idrAmount: 800000, amount: 800000, currency: 'IDR' },
  ]

  it('should aggregate transactions by category', () => {
    const result = aggregateByCategory(mockTransactions, [])

    expect(result.length).toBeGreaterThan(0)
    const foodCategory = result.find(c => c.name === 'Food')
    expect(foodCategory?.value).toBe(1500000) // 1M + 500K
  })

  it('should exclude specified categories', () => {
    const result = aggregateByCategory(mockTransactions, ['Transfer'])

    const transferCategory = result.find(c => c.name === 'Transfer')
    expect(transferCategory).toBeUndefined()
  })

  it('should calculate correct percentages', () => {
    const result = aggregateByCategory(mockTransactions, ['Transfer'])

    // Total without Transfer: 1M + 500K + 200K + 800K = 2.5M
    const totalValue = result.reduce((sum, c) => sum + c.value, 0)
    expect(totalValue).toBe(2500000)

    const foodCategory = result.find(c => c.name === 'Food')
    expect(foodCategory?.percentage).toBe(60) // 1.5M / 2.5M = 60%
  })

  it('should assign colors to categories', () => {
    const result = aggregateByCategory(mockTransactions, ['Transfer'])

    result.forEach(category => {
      expect(category.color).toBeDefined()
      expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })

  it('should sort by value descending', () => {
    const result = aggregateByCategory(mockTransactions, ['Transfer'])

    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].value).toBeGreaterThanOrEqual(result[i].value)
    }
  })

  it('should handle empty transactions', () => {
    const result = aggregateByCategory([], [])

    expect(result).toEqual([])
  })

  it('should use idrAmount when available, fallback to amount', () => {
    const transactions = [
      { category: 'Food', idrAmount: 150000, amount: 10, currency: 'USD' },
      { category: 'Food', idrAmount: null, amount: 50000, currency: 'IDR' },
    ]

    const result = aggregateByCategory(transactions, [])
    const foodCategory = result.find(c => c.name === 'Food')

    // Should use idrAmount (150K) + amount fallback (50K) = 200K
    expect(foodCategory?.value).toBe(200000)
  })
})

describe('aggregateByDay', () => {
  const startDate = new Date(2026, 0, 1) // Jan 1, 2026
  const endDate = new Date(2026, 0, 31, 23, 59, 59) // Jan 31, 2026

  const mockTransactions = [
    { date: new Date(2026, 0, 1), idrAmount: 100000, amount: 100000, currency: 'IDR' },
    { date: new Date(2026, 0, 1), idrAmount: 50000, amount: 50000, currency: 'IDR' },
    { date: new Date(2026, 0, 3), idrAmount: 200000, amount: 200000, currency: 'IDR' },
    { date: new Date(2026, 0, 5), idrAmount: 150000, amount: 150000, currency: 'IDR' },
  ]

  it('should return array with entry for each day of the period', () => {
    const result = aggregateByDay(mockTransactions, startDate, endDate)

    expect(result.length).toBe(31) // January has 31 days
  })

  it('should aggregate transactions for the same day', () => {
    const result = aggregateByDay(mockTransactions, startDate, endDate)

    const jan1 = result.find(d => d.date === '2026-01-01')
    expect(jan1?.amount).toBe(150000) // 100K + 50K
  })

  it('should have zero amount for days without transactions', () => {
    const result = aggregateByDay(mockTransactions, startDate, endDate)

    const jan2 = result.find(d => d.date === '2026-01-02')
    expect(jan2?.amount).toBe(0)
  })

  it('should calculate cumulative amount correctly', () => {
    const result = aggregateByDay(mockTransactions, startDate, endDate)

    const jan1 = result.find(d => d.date === '2026-01-01')
    const jan2 = result.find(d => d.date === '2026-01-02')
    const jan3 = result.find(d => d.date === '2026-01-03')

    expect(jan1?.cumulativeAmount).toBe(150000) // 150K
    expect(jan2?.cumulativeAmount).toBe(150000) // Still 150K (no new spending)
    expect(jan3?.cumulativeAmount).toBe(350000) // 150K + 200K
  })

  it('should format date as YYYY-MM-DD', () => {
    const result = aggregateByDay(mockTransactions, startDate, endDate)

    result.forEach(day => {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  it('should handle empty transactions', () => {
    const result = aggregateByDay([], startDate, endDate)

    expect(result.length).toBe(31)
    result.forEach(day => {
      expect(day.amount).toBe(0)
      expect(day.cumulativeAmount).toBe(0)
    })
  })

  it('should handle string dates in transactions', () => {
    const transactions = [
      { date: '2026-01-01T10:00:00Z', idrAmount: 100000, amount: 100000, currency: 'IDR' },
    ]

    const result = aggregateByDay(transactions, startDate, endDate)
    const jan1 = result.find(d => d.date === '2026-01-01')

    expect(jan1?.amount).toBe(100000)
  })
})
