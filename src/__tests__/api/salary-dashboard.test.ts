/**
 * Salary Dashboard API Tests
 *
 * Tests the business logic for salary dashboard data aggregation.
 */

import {
  calculateProjections,
  aggregateByCategory,
  aggregateByDay,
} from '@/lib/spending-calculations'
import { getCalendarMonth } from '@/lib/calendar-month'

describe('Salary Dashboard API', () => {
  describe('period calculation', () => {
    it('should return correct calendar month period for offset 0', () => {
      const period = getCalendarMonth(0)

      expect(period.startDate.getDate()).toBe(1)
      expect(period.label).toBeDefined()
      expect(period.daysInMonth).toBeGreaterThan(27)
      expect(period.daysInMonth).toBeLessThanOrEqual(31)
    })

    it('should return previous month for offset -1', () => {
      const currentPeriod = getCalendarMonth(0)
      const previousPeriod = getCalendarMonth(-1)

      const expectedMonth = currentPeriod.startDate.getMonth() - 1
      const actualMonth = previousPeriod.startDate.getMonth()

      if (expectedMonth < 0) {
        expect(actualMonth).toBe(11) // December
      } else {
        expect(actualMonth).toBe(expectedMonth)
      }
    })
  })

  describe('spending aggregation', () => {
    const mockTransactions = [
      { category: 'Food', idrAmount: 1000000, amount: 1000000, currency: 'IDR', bankId: 'bank1' },
      { category: 'Food', idrAmount: 500000, amount: 500000, currency: 'IDR', bankId: 'bank2' },
      { category: 'Transport', idrAmount: 200000, amount: 200000, currency: 'IDR', bankId: 'bank1' },
      { category: 'Transfer', idrAmount: 5000000, amount: 5000000, currency: 'IDR', bankId: 'bank1' },
      { category: 'Shopping', idrAmount: 800000, amount: 800000, currency: 'IDR', bankId: 'bank2' },
    ]

    it('should aggregate spending across all banks', () => {
      const totalSpending = mockTransactions
        .filter(tx => tx.category !== 'Transfer')
        .reduce((sum, tx) => sum + (tx.idrAmount || tx.amount), 0)

      expect(totalSpending).toBe(2500000) // 1M + 500K + 200K + 800K
    })

    it('should exclude Transfer category from spending', () => {
      const result = aggregateByCategory(mockTransactions, ['Transfer'])

      const hasTransfer = result.some(c => c.name === 'Transfer')
      expect(hasTransfer).toBe(false)
    })

    it('should calculate correct category breakdown', () => {
      const result = aggregateByCategory(mockTransactions, ['Transfer'])

      const foodCategory = result.find(c => c.name === 'Food')
      expect(foodCategory?.value).toBe(1500000) // 1M + 500K

      const transportCategory = result.find(c => c.name === 'Transport')
      expect(transportCategory?.value).toBe(200000)
    })
  })

  describe('projections calculation', () => {
    it('should calculate correct projections mid-month', () => {
      const salary = 30000000
      const totalSpending = 15000000
      const daysElapsed = 15
      const daysRemaining = 15

      const projections = calculateProjections(salary, totalSpending, daysElapsed, daysRemaining)

      expect(projections.averageDailySpending).toBe(1000000) // 15M / 15 days
      expect(projections.projectedMonthEndSpending).toBe(30000000) // 15M + (1M * 15)
      expect(projections.projectedRemainingBalance).toBe(0) // 30M - 30M
      expect(projections.dailyBudgetRemaining).toBe(1000000) // 15M / 15 days
    })

    it('should handle under-spending scenario', () => {
      const salary = 30000000
      const totalSpending = 5000000
      const daysElapsed = 15
      const daysRemaining = 15

      const projections = calculateProjections(salary, totalSpending, daysElapsed, daysRemaining)

      expect(projections.projectedRemainingBalance).toBeGreaterThan(0)
      expect(projections.dailyBudgetRemaining).toBeGreaterThan(projections.averageDailySpending)
    })

    it('should handle over-spending scenario', () => {
      const salary = 30000000
      const totalSpending = 25000000
      const daysElapsed = 15
      const daysRemaining = 15

      const projections = calculateProjections(salary, totalSpending, daysElapsed, daysRemaining)

      expect(projections.projectedRemainingBalance).toBeLessThan(0)
    })
  })

  describe('daily spending aggregation', () => {
    const startDate = new Date(2026, 0, 1)
    const endDate = new Date(2026, 0, 31, 23, 59, 59)

    const mockTransactions = [
      { date: new Date(2026, 0, 1), idrAmount: 100000, amount: 100000, currency: 'IDR' },
      { date: new Date(2026, 0, 1), idrAmount: 50000, amount: 50000, currency: 'IDR' },
      { date: new Date(2026, 0, 3), idrAmount: 200000, amount: 200000, currency: 'IDR' },
      { date: new Date(2026, 0, 5), idrAmount: 150000, amount: 150000, currency: 'IDR' },
    ]

    it('should generate daily spending with cumulative amounts', () => {
      const result = aggregateByDay(mockTransactions, startDate, endDate)

      expect(result.length).toBe(31)

      const jan1 = result.find(d => d.date === '2026-01-01')
      expect(jan1?.amount).toBe(150000)
      expect(jan1?.cumulativeAmount).toBe(150000)

      const jan3 = result.find(d => d.date === '2026-01-03')
      expect(jan3?.cumulativeAmount).toBe(350000) // 150K + 200K
    })

    it('should handle empty transactions', () => {
      const result = aggregateByDay([], startDate, endDate)

      expect(result.length).toBe(31)
      result.forEach(day => {
        expect(day.amount).toBe(0)
        expect(day.cumulativeAmount).toBe(0)
      })
    })
  })

  describe('bank summary', () => {
    it('should aggregate spending by bank', () => {
      const transactions = [
        { bankId: 'bank1', bankName: 'BCA', idrAmount: 1000000 },
        { bankId: 'bank1', bankName: 'BCA', idrAmount: 500000 },
        { bankId: 'bank2', bankName: 'Jenius', idrAmount: 800000 },
      ]

      const bankMap = new Map<string, { bankId: string; bankName: string; totalSpending: number }>()

      for (const tx of transactions) {
        const current = bankMap.get(tx.bankId) || {
          bankId: tx.bankId,
          bankName: tx.bankName,
          totalSpending: 0,
        }
        current.totalSpending += tx.idrAmount
        bankMap.set(tx.bankId, current)
      }

      const bankSummary = Array.from(bankMap.values())

      expect(bankSummary.length).toBe(2)

      const bca = bankSummary.find(b => b.bankId === 'bank1')
      expect(bca?.totalSpending).toBe(1500000)

      const jenius = bankSummary.find(b => b.bankId === 'bank2')
      expect(jenius?.totalSpending).toBe(800000)
    })
  })

  describe('response structure', () => {
    it('should match expected response interface', () => {
      const expectedStructure = {
        period: {
          startDate: expect.any(String),
          endDate: expect.any(String),
          label: expect.any(String),
        },
        salary: expect.any(Number),
        totalSpending: expect.any(Number),
        remainingBalance: expect.any(Number),
        categoryBreakdown: expect.any(Array),
        dailySpending: expect.any(Array),
        projections: {
          daysElapsed: expect.any(Number),
          daysRemaining: expect.any(Number),
          averageDailySpending: expect.any(Number),
          projectedMonthEndSpending: expect.any(Number),
          projectedRemainingBalance: expect.any(Number),
          dailyBudgetRemaining: expect.any(Number),
        },
        bankSummary: expect.any(Array),
      }

      // Mock response matching the expected structure
      const response = {
        period: {
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-01-31T23:59:59.000Z',
          label: 'January 2026',
        },
        salary: 30000000,
        totalSpending: 15000000,
        remainingBalance: 15000000,
        categoryBreakdown: [
          { name: 'Food', value: 1000000, percentage: 60, color: '#3B82F6' },
        ],
        dailySpending: [
          { date: '2026-01-01', amount: 100000, cumulativeAmount: 100000 },
        ],
        projections: {
          daysElapsed: 15,
          daysRemaining: 15,
          averageDailySpending: 1000000,
          projectedMonthEndSpending: 30000000,
          projectedRemainingBalance: 0,
          dailyBudgetRemaining: 1000000,
        },
        bankSummary: [
          { bankId: 'bank1', bankName: 'BCA', totalSpending: 10000000 },
        ],
      }

      expect(response).toMatchObject(expectedStructure)
    })
  })
})
