import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getActiveInstallments, getEffectiveAmount } from '@/lib/installments'
import type { ChartData } from '@/types'

const EXCLUDED_CATEGORIES = ['Transfer', 'Credit Card Payment']

// GET /api/transactions - Get transactions with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bankId = searchParams.get('bankId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const monthOffset = parseInt(searchParams.get('monthOffset') || '0', 10)

    const where: Prisma.TransactionWhereInput = {}

    if (bankId) {
      where.bankId = bankId
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    // Get bank info for installment calculations
    const bank = bankId ? await prisma.bank.findUnique({
      where: { id: bankId },
      select: { statementDay: true, bankType: true },
    }) : null

    const statementDay = bank?.statementDay || 1
    const isCreditCard = bank?.bankType === 'credit'

    // For installments, we need to fetch transactions that might have started earlier
    // but are still active (up to 24 months back)
    let allTransactionsForInstallments: typeof transactions = []

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        bank: {
          select: { name: true, color: true, statementDay: true },
        },
      },
    })

    // If credit card, also fetch older transactions for installment tracking
    if (isCreditCard && bankId) {
      const twoYearsAgo = new Date()
      twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24)

      allTransactionsForInstallments = await prisma.transaction.findMany({
        where: {
          bankId,
          installmentTerms: { gt: 1 },
          date: { gte: twoYearsAgo },
        },
        orderBy: { date: 'desc' },
        include: {
          bank: {
            select: { name: true, color: true, statementDay: true },
          },
        },
      })
    }

    // Calculate category totals for chart (excluding transfers and CC payments)
    // For installments, use effective amount for the period
    const categoryTotals: Record<string, number> = {}
    let total = 0

    for (const tx of transactions) {
      if (!EXCLUDED_CATEGORIES.includes(tx.category)) {
        const amount = tx.idrAmount ?? tx.amount
        const effectiveAmount = isCreditCard && tx.installmentTerms && tx.installmentTerms > 1
          ? getEffectiveAmount(amount, tx.installmentTerms, tx.date, statementDay, monthOffset)
          : amount

        if (effectiveAmount > 0) {
          categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + effectiveAmount
          total += effectiveAmount
        }
      }
    }

    // Add installment amounts from older transactions that are still active
    for (const tx of allTransactionsForInstallments) {
      // Skip if already in current period transactions
      if (transactions.some(t => t.id === tx.id)) continue
      if (EXCLUDED_CATEGORIES.includes(tx.category)) continue

      const amount = tx.idrAmount ?? tx.amount
      const effectiveAmount = getEffectiveAmount(amount, tx.installmentTerms, tx.date, statementDay, monthOffset)

      if (effectiveAmount > 0) {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + effectiveAmount
        total += effectiveAmount
      }
    }

    const chartData: ChartData[] = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))

    // Get active installments for display
    const activeInstallments = isCreditCard
      ? getActiveInstallments(
          allTransactionsForInstallments.map(tx => ({
            id: tx.id,
            merchant: tx.merchant,
            amount: tx.amount,
            idrAmount: tx.idrAmount,
            date: tx.date,
            installmentTerms: tx.installmentTerms,
          })),
          statementDay,
          monthOffset
        )
      : []

    return successResponse({
      transactions,
      chartData,
      total,
      activeInstallments,
    })
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return errorResponse('Failed to fetch transactions')
  }
}
