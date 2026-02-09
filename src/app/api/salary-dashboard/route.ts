import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getCalendarMonth } from '@/lib/calendar-month'
import { getBillingPeriod } from '@/lib/billing-cycle'
import { getActiveInstallments, getEffectiveAmount } from '@/lib/installments'
import {
  calculateProjections,
  aggregateByCategory,
  aggregateByDay,
} from '@/lib/spending-calculations'
import { CONFIG } from '@/lib/constants'

const DEFAULT_SALARY = 30000000
// For "My Spending" calculations - excludes Papa, Bebe, transfers
const MY_SPENDING_EXCLUDED: readonly string[] = CONFIG.SPENDING.MY_SPENDING_EXCLUDED
// For CC Payment Due - only excludes transfers (includes Papa, Bebe since you pay full bill)
const CC_PAYMENT_EXCLUDED: readonly string[] = CONFIG.SPENDING.BOTH_EXCLUDED

/**
 * Check if a payment date is in the payment window for a CC
 */
function isInPaymentWindow(
  paymentDate: Date,
  statementDay: number,
  dueDay: number,
  graceDays: number = 3
): boolean {
  const day = paymentDate.getDate()
  if (dueDay > statementDay) {
    return day >= statementDay && day <= dueDay + graceDays
  } else {
    return day >= statementDay || day <= dueDay + graceDays
  }
}

/**
 * Match a debit bank to a credit card by name
 */
function matchDebitToCc(
  debitBankName: string,
  creditBanks: { id: string; name: string }[]
): { id: string; name: string } | null {
  const debitNameLower = debitBankName.toLowerCase()
  for (const cc of creditBanks) {
    const ccNameParts = cc.name.toLowerCase().split(/\s+/)
    for (const part of ccNameParts) {
      if (part.length >= 3 && debitNameLower.includes(part)) {
        return cc
      }
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const monthOffset = parseInt(searchParams.get('monthOffset') || '0', 10)

    const calendarPeriod = getCalendarMonth(monthOffset)

    // Parallel fetch: settings and banks
    const [salarySettingResult, banks] = await Promise.all([
      prisma.settings.findUnique({ where: { key: 'salary.monthlyAmount' } }),
      prisma.bank.findMany(),
    ])

    const salary = salarySettingResult
      ? parseFloat(salarySettingResult.value)
      : DEFAULT_SALARY

    const debitBanks = banks.filter(b => b.bankType === 'debit')
    const creditBanks = banks.filter(b => b.bankType === 'credit')

    // Calculate date ranges for all CC billing periods
    let earliestCcStart = calendarPeriod.startDate
    let latestCcEnd = calendarPeriod.endDate

    const ccPeriods = creditBanks.map(ccBank => {
      // Use calendar month start as reference to get the CC period whose due date falls within this calendar month
      // E.g., for February calendar month and BCA (statement day 3):
      // - Feb 1 < statement day 3, so getBillingPeriod returns Jan 3 - Feb 2 (due Feb 19)
      // This is the correct period for February budget since payment is due in February
      const period = getBillingPeriod(ccBank.statementDay, monthOffset, calendarPeriod.startDate)
      if (period.startDate < earliestCcStart) earliestCcStart = period.startDate
      if (period.endDate > latestCcEnd) latestCcEnd = period.endDate
      return { bank: ccBank, period }
    })

    // Fetch transactions for current period
    const allTransactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: earliestCcStart < calendarPeriod.startDate ? earliestCcStart : calendarPeriod.startDate,
          lte: latestCcEnd > calendarPeriod.endDate ? latestCcEnd : calendarPeriod.endDate,
        },
      },
      include: {
        bank: { select: { id: true, name: true, bankType: true, statementDay: true } },
      },
      orderBy: { date: 'asc' },
    })

    // Fetch older installment transactions (up to 24 months back)
    const twoYearsAgo = new Date()
    twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24)

    const installmentTransactions = await prisma.transaction.findMany({
      where: {
        bankId: { in: creditBanks.map(b => b.id) },
        installmentTerms: { gt: 1 },
        date: { gte: twoYearsAgo },
      },
      include: {
        bank: { select: { id: true, name: true, bankType: true, statementDay: true } },
      },
    })

    // Split transactions
    const debitBankIds = new Set(debitBanks.map(b => b.id))

    const debitTransactions = allTransactions.filter(tx =>
      debitBankIds.has(tx.bankId) &&
      tx.date >= calendarPeriod.startDate &&
      tx.date <= calendarPeriod.endDate
    )

    // Process each CC
    const ccPaymentDetails: { bankId: string; bankName: string; statementPeriod: string; amount: number }[] = []
    const ccPaymentsMade: { bankName: string; merchant: string; date: string; amount: number; forCc?: string }[] = []
    const allCreditSpending: { amount: number; category: string; bankId: string; bankName: string; bankType: string }[] = []
    const allInstallments: ReturnType<typeof getActiveInstallments> = []
    const processedPaymentIds = new Set<string>()
    const processedTxIds = new Set<string>()

    for (const { bank: ccBank, period: ccPeriod } of ccPeriods) {
      const statementDay = ccBank.statementDay

      // Get CC transactions for this period
      const ccTransactions = allTransactions.filter(tx =>
        tx.bankId === ccBank.id &&
        tx.date >= ccPeriod.startDate &&
        tx.date <= ccPeriod.endDate
      )

      // Separate spending vs payments
      const ccSpending = ccTransactions.filter(tx => tx.category !== 'Credit Card Payment')
      const ccPaymentsFromSelf = ccTransactions.filter(tx => tx.category === 'Credit Card Payment')

      // Calculate effective spending (accounting for installments)
      // ccAmount = full amount for CC Payment Due (includes Papa, Bebe)
      // allCreditSpending = for category breakdown (excludes Papa, Bebe)
      let ccAmount = 0
      for (const tx of ccSpending) {
        // Skip only transfers for CC Payment Due calculation
        if (CC_PAYMENT_EXCLUDED.includes(tx.category)) continue
        processedTxIds.add(tx.id)

        const amount = tx.idrAmount ?? tx.amount
        const terms = tx.installmentTerms

        if (terms && terms > 1) {
          // Installment: use monthly amount (pass calendarPeriod.startDate for consistent billing period calculation)
          const effectiveAmount = getEffectiveAmount(amount, terms, tx.date, statementDay, monthOffset, calendarPeriod.startDate)
          ccAmount += effectiveAmount
          // Only add to category breakdown if not in MY_SPENDING_EXCLUDED
          if (effectiveAmount !== 0 && !MY_SPENDING_EXCLUDED.includes(tx.category)) {
            allCreditSpending.push({
              amount: effectiveAmount,
              category: tx.category,
              bankId: tx.bankId,
              bankName: tx.bank.name,
              bankType: tx.bank.bankType,
            })
          }
        } else {
          // Full payment
          ccAmount += amount
          // Only add to category breakdown if not in MY_SPENDING_EXCLUDED
          if (!MY_SPENDING_EXCLUDED.includes(tx.category)) {
            allCreditSpending.push({
              amount,
              category: tx.category,
              bankId: tx.bankId,
              bankName: tx.bank.name,
              bankType: tx.bank.bankType,
            })
          }
        }
      }

      // Add installments from older transactions
      const ccInstallmentTx = installmentTransactions.filter(tx => tx.bankId === ccBank.id)
      for (const tx of ccInstallmentTx) {
        if (processedTxIds.has(tx.id)) continue
        // Skip only transfers for CC Payment Due calculation
        if (CC_PAYMENT_EXCLUDED.includes(tx.category)) continue

        const amount = tx.idrAmount ?? tx.amount
        const effectiveAmount = getEffectiveAmount(amount, tx.installmentTerms, tx.date, statementDay, monthOffset, calendarPeriod.startDate)

        if (effectiveAmount !== 0) {
          ccAmount += effectiveAmount
          // Only add to category breakdown if not in MY_SPENDING_EXCLUDED
          if (!MY_SPENDING_EXCLUDED.includes(tx.category)) {
            allCreditSpending.push({
              amount: effectiveAmount,
              category: tx.category,
              bankId: tx.bankId,
              bankName: tx.bank.name,
              bankType: tx.bank.bankType,
            })
          }
        }
      }

      // Get active installments for this CC
      const ccActiveInstallments = getActiveInstallments(
        ccInstallmentTx.map(tx => ({
          id: tx.id,
          merchant: tx.merchant,
          amount: tx.amount,
          idrAmount: tx.idrAmount,
          date: tx.date,
          installmentTerms: tx.installmentTerms,
        })),
        statementDay,
        monthOffset,
        calendarPeriod.startDate
      )
      allInstallments.push(...ccActiveInstallments)

      if (ccAmount > 0) {
        ccPaymentDetails.push({
          bankId: ccBank.id,
          bankName: ccBank.name,
          statementPeriod: ccPeriod.label,
          amount: ccAmount,
        })
      }

      // Payments from CC account itself
      if (ccBank.dueDay) {
        for (const paymentTx of ccPaymentsFromSelf) {
          if (processedPaymentIds.has(paymentTx.id)) continue
          if (isInPaymentWindow(paymentTx.date, statementDay, ccBank.dueDay)) {
            ccPaymentsMade.push({
              bankName: paymentTx.bank.name,
              merchant: paymentTx.merchant,
              date: paymentTx.date.toISOString(),
              amount: paymentTx.idrAmount ?? paymentTx.amount,
              forCc: ccBank.name,
            })
            processedPaymentIds.add(paymentTx.id)
          }
        }
      }

      // Payments from debit accounts
      const debitCcPayments = debitTransactions.filter(tx => tx.category === 'Credit Card Payment')
      for (const paymentTx of debitCcPayments) {
        if (processedPaymentIds.has(paymentTx.id)) continue
        if (!ccBank.dueDay) continue

        const matchedCc = matchDebitToCc(paymentTx.bank.name, [{ id: ccBank.id, name: ccBank.name }])
        if (matchedCc && isInPaymentWindow(paymentTx.date, statementDay, ccBank.dueDay)) {
          ccPaymentsMade.push({
            bankName: paymentTx.bank.name,
            merchant: paymentTx.merchant,
            date: paymentTx.date.toISOString(),
            amount: paymentTx.idrAmount ?? paymentTx.amount,
            forCc: ccBank.name,
          })
          processedPaymentIds.add(paymentTx.id)
        }
      }
    }

    // Filter debit transactions
    const filteredDebitTx = debitTransactions.filter(tx => !MY_SPENDING_EXCLUDED.includes(tx.category))

    // Calculate totals
    const debitSpending = filteredDebitTx.reduce((sum, tx) => sum + (tx.idrAmount ?? tx.amount), 0)
    const ccSpendingTotal = allCreditSpending.reduce((sum, item) => sum + item.amount, 0)
    const ccBillTotal = ccPaymentDetails.reduce((sum, cc) => sum + cc.amount, 0)
    const ccPaymentsMadeTotal = ccPaymentsMade.reduce((sum, p) => sum + p.amount, 0)
    const ccPaymentDue = ccBillTotal - ccPaymentsMadeTotal
    const totalSpending = debitSpending + ccSpendingTotal
    const remainingBalance = salary - totalSpending

    // Category breakdown (debit + credit)
    const allSpendingForCategory = [
      ...filteredDebitTx.map(tx => ({
        category: tx.category,
        idrAmount: tx.idrAmount,
        amount: tx.amount,
        currency: tx.currency,
      })),
      ...allCreditSpending.map(item => ({
        category: item.category,
        idrAmount: item.amount,
        amount: item.amount,
        currency: 'IDR',
      })),
    ]

    const categoryBreakdown = aggregateByCategory(allSpendingForCategory, [])

    // Daily spending (debit only)
    const dailySpending = aggregateByDay(
      filteredDebitTx.map(tx => ({
        date: tx.date,
        idrAmount: tx.idrAmount,
        amount: tx.amount,
        currency: tx.currency,
      })),
      calendarPeriod.startDate,
      calendarPeriod.endDate
    )

    // Days calculation
    const now = new Date()
    let daysElapsed: number
    let daysRemaining: number

    if (now < calendarPeriod.startDate) {
      daysElapsed = 0
      daysRemaining = calendarPeriod.daysInMonth
    } else if (now > calendarPeriod.endDate) {
      daysElapsed = calendarPeriod.daysInMonth
      daysRemaining = 0
    } else {
      daysElapsed = Math.floor(
        (now.getTime() - calendarPeriod.startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1
      daysRemaining = calendarPeriod.daysInMonth - daysElapsed
    }

    const projections = calculateProjections(salary, totalSpending, daysElapsed, daysRemaining)

    // Bank summary
    const bankMap = new Map<string, { bankId: string; bankName: string; bankType: string; totalSpending: number }>()

    for (const tx of filteredDebitTx) {
      const current = bankMap.get(tx.bankId) || {
        bankId: tx.bankId,
        bankName: tx.bank.name,
        bankType: tx.bank.bankType,
        totalSpending: 0,
      }
      current.totalSpending += tx.idrAmount ?? tx.amount
      bankMap.set(tx.bankId, current)
    }

    for (const item of allCreditSpending) {
      const current = bankMap.get(item.bankId) || {
        bankId: item.bankId,
        bankName: item.bankName,
        bankType: item.bankType,
        totalSpending: 0,
      }
      current.totalSpending += item.amount
      bankMap.set(item.bankId, current)
    }

    const bankSummary = Array.from(bankMap.values()).sort((a, b) => b.totalSpending - a.totalSpending)

    return successResponse({
      period: {
        startDate: calendarPeriod.startDate.toISOString(),
        endDate: calendarPeriod.endDate.toISOString(),
        label: calendarPeriod.label,
      },
      salary,
      debitSpending,
      ccPaymentDue,
      ccPaymentDetails,
      ccPaymentsMade,
      totalSpending,
      remainingBalance,
      categoryBreakdown,
      dailySpending,
      projections,
      bankSummary,
      activeInstallments: allInstallments,
    })
  } catch (error) {
    console.error('Failed to fetch salary dashboard data:', error)
    return errorResponse('Failed to fetch salary dashboard data')
  }
}
