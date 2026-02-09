import { CONFIG } from './constants'
import { getEffectiveAmount } from './installments'

export interface Projections {
  daysElapsed: number
  daysRemaining: number
  averageDailySpending: number
  projectedMonthEndSpending: number
  projectedRemainingBalance: number
  dailyBudgetRemaining: number
}

export interface CategoryBreakdown {
  name: string
  value: number
  percentage: number
  color: string
}

export interface DailySpending {
  date: string
  amount: number
  cumulativeAmount: number
}

interface TransactionLike {
  category: string
  idrAmount: number | null
  amount: number
  currency: string
}

interface TransactionWithDate {
  date: Date | string
  idrAmount: number | null
  amount: number
  currency: string
}

export function calculateProjections(
  salary: number,
  totalSpending: number,
  daysElapsed: number,
  daysRemaining: number
): Projections {
  const remainingBalance = salary - totalSpending

  const averageDailySpending = daysElapsed > 0 ? totalSpending / daysElapsed : 0

  const projectedMonthEndSpending = totalSpending + averageDailySpending * daysRemaining

  const projectedRemainingBalance = salary - projectedMonthEndSpending

  const dailyBudgetRemaining = daysRemaining > 0 ? remainingBalance / daysRemaining : 0

  return {
    daysElapsed,
    daysRemaining,
    averageDailySpending,
    projectedMonthEndSpending,
    projectedRemainingBalance,
    dailyBudgetRemaining,
  }
}

export function aggregateByCategory(
  transactions: TransactionLike[],
  excludeCategories: string[]
): CategoryBreakdown[] {
  const filtered = transactions.filter(
    tx => !excludeCategories.includes(tx.category)
  )

  if (filtered.length === 0) {
    return []
  }

  const categoryMap = new Map<string, number>()

  for (const tx of filtered) {
    const amount = tx.idrAmount ?? tx.amount
    const current = categoryMap.get(tx.category) || 0
    categoryMap.set(tx.category, current + amount)
  }

  const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0)

  const result: CategoryBreakdown[] = []
  let colorIndex = 0

  for (const [name, value] of categoryMap) {
    result.push({
      name,
      value,
      percentage: Math.round((value / total) * 100),
      color: CONFIG.UI.CHART_COLORS[colorIndex % CONFIG.UI.CHART_COLORS.length],
    })
    colorIndex++
  }

  return result.sort((a, b) => b.value - a.value)
}

export function aggregateByDay(
  transactions: TransactionWithDate[],
  startDate: Date,
  endDate: Date
): DailySpending[] {
  const dayMap = new Map<string, number>()

  for (const tx of transactions) {
    const date = tx.date instanceof Date ? tx.date : new Date(tx.date)
    const dateKey = formatDateKey(date)
    const amount = tx.idrAmount ?? tx.amount
    const current = dayMap.get(dateKey) || 0
    dayMap.set(dateKey, current + amount)
  }

  const result: DailySpending[] = []
  let cumulativeAmount = 0

  const current = new Date(startDate)
  while (current <= endDate) {
    const dateKey = formatDateKey(current)
    const amount = dayMap.get(dateKey) || 0
    cumulativeAmount += amount

    result.push({
      date: dateKey,
      amount,
      cumulativeAmount,
    })

    current.setDate(current.getDate() + 1)
  }

  return result
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export interface SpendingTransaction {
  category: string
  amount: number
  idrAmount: number | null
  date: Date
  installmentTerms: number | null
}

export interface SpendingTotals {
  mySpending: number
  totalSpending: number
  categoryTotals: Record<string, number>
}

/**
 * Calculate spending totals from a list of transactions
 * Handles installments and category exclusions consistently
 */
export function calculateSpendingTotals(
  transactions: SpendingTransaction[],
  options: {
    isCreditCard?: boolean
    statementDay?: number
    monthOffset?: number
    referenceDate?: Date
  } = {}
): SpendingTotals {
  const { isCreditCard = false, statementDay = 1, monthOffset = 0, referenceDate } = options
  const MY_SPENDING_EXCLUDED: readonly string[] = CONFIG.SPENDING.MY_SPENDING_EXCLUDED
  const BOTH_EXCLUDED: readonly string[] = CONFIG.SPENDING.BOTH_EXCLUDED

  const categoryTotals: Record<string, number> = {}
  let mySpending = 0
  let totalSpending = 0

  for (const tx of transactions) {
    const amount = tx.idrAmount ?? tx.amount
    const effectiveAmount = isCreditCard && tx.installmentTerms && tx.installmentTerms > 1
      ? getEffectiveAmount(amount, tx.installmentTerms, tx.date, statementDay, monthOffset, referenceDate)
      : amount

    if (effectiveAmount !== 0) {
      // Add/subtract to total spending if not in BOTH_EXCLUDED
      if (!BOTH_EXCLUDED.includes(tx.category)) {
        totalSpending += effectiveAmount
      }
      // Add/subtract to my spending and chart if not in MY_SPENDING_EXCLUDED
      if (!MY_SPENDING_EXCLUDED.includes(tx.category)) {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + effectiveAmount
        mySpending += effectiveAmount
      }
    }
  }

  return { mySpending, totalSpending, categoryTotals }
}
