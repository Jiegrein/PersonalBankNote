import { getBillingPeriod } from './billing-cycle'

export const INSTALLMENT_OPTIONS = [1, 3, 6, 12, 24] as const
export type InstallmentTerms = typeof INSTALLMENT_OPTIONS[number]

export interface InstallmentInfo {
  transactionId: string
  merchant: string
  totalAmount: number
  monthlyAmount: number
  terms: number
  currentInstallment: number
  isActive: boolean
  startDate: Date
  transactionDate: Date
}

/**
 * Calculate the monthly installment amount
 */
export function getMonthlyAmount(totalAmount: number, terms: number): number {
  if (!terms || terms <= 1) return totalAmount
  return Math.round(totalAmount / terms)
}

/**
 * Get which installment number applies to a given billing period
 * Returns 0 if not yet started, or > terms if completed
 */
export function getInstallmentNumber(
  transactionDate: Date,
  statementDay: number,
  viewMonthOffset: number,
  referenceDate?: Date
): number {
  // Get the billing period for the transaction date
  const txDate = new Date(transactionDate)
  const txYear = txDate.getFullYear()
  const txMonth = txDate.getMonth()
  const txDay = txDate.getDate()

  // Determine which billing period the transaction falls into
  // If transaction is before statement day, it's in the current period
  // If after statement day, it goes to next period's bill
  let txBillingMonth = txMonth
  let txBillingYear = txYear
  if (txDay >= statementDay) {
    // Transaction after statement day goes to next month's bill
    txBillingMonth += 1
    if (txBillingMonth > 11) {
      txBillingMonth = 0
      txBillingYear += 1
    }
  }

  // Get the billing period we're viewing (use endDate to match statement labeling)
  const viewPeriod = getBillingPeriod(statementDay, viewMonthOffset, referenceDate)
  const viewYear = viewPeriod.endDate.getFullYear()
  const viewMonth = viewPeriod.endDate.getMonth()

  // Calculate months elapsed
  const monthsElapsed = (viewYear - txBillingYear) * 12 + (viewMonth - txBillingMonth) + 1

  return monthsElapsed
}

/**
 * Check if an installment is active for a given billing period
 */
export function isInstallmentActiveForPeriod(
  transactionDate: Date,
  terms: number,
  statementDay: number,
  viewMonthOffset: number,
  referenceDate?: Date
): boolean {
  const installmentNum = getInstallmentNumber(transactionDate, statementDay, viewMonthOffset, referenceDate)
  return installmentNum >= 1 && installmentNum <= terms
}

/**
 * Get all active installments for a billing period
 */
export function getActiveInstallments(
  transactions: Array<{
    id: string
    merchant: string
    amount: number
    idrAmount: number | null
    date: Date
    installmentTerms: number | null
  }>,
  statementDay: number,
  viewMonthOffset: number,
  referenceDate?: Date
): InstallmentInfo[] {
  const installments: InstallmentInfo[] = []

  for (const tx of transactions) {
    const terms = tx.installmentTerms
    if (!terms || terms <= 1) continue

    const installmentNum = getInstallmentNumber(tx.date, statementDay, viewMonthOffset, referenceDate)

    if (installmentNum >= 1 && installmentNum <= terms) {
      const totalAmount = tx.idrAmount ?? tx.amount
      installments.push({
        transactionId: tx.id,
        merchant: tx.merchant,
        totalAmount,
        monthlyAmount: getMonthlyAmount(totalAmount, terms),
        terms,
        currentInstallment: installmentNum,
        isActive: true,
        startDate: tx.date,
        transactionDate: tx.date,
      })
    }
  }

  return installments.sort((a, b) => a.currentInstallment - b.currentInstallment)
}

/**
 * Calculate the effective spending amount for a transaction in a given period
 * - Full payment (terms null or 1): return full amount
 * - Installment: return monthly amount if active, 0 if not active for this period
 */
export function getEffectiveAmount(
  amount: number,
  terms: number | null,
  transactionDate: Date,
  statementDay: number,
  viewMonthOffset: number,
  referenceDate?: Date
): number {
  if (!terms || terms <= 1) {
    return amount
  }

  const installmentNum = getInstallmentNumber(transactionDate, statementDay, viewMonthOffset, referenceDate)

  if (installmentNum >= 1 && installmentNum <= terms) {
    return getMonthlyAmount(amount, terms)
  }

  return 0
}
