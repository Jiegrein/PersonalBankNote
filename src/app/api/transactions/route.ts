import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { getActiveInstallments } from '@/lib/installments'
import { calculateSpendingTotals } from '@/lib/spending-calculations'
import type { ChartData } from '@/types'

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

    // Combine current transactions with older installment transactions (avoiding duplicates)
    const allTransactionsForCalculation = [
      ...transactions,
      ...allTransactionsForInstallments.filter(tx => !transactions.some(t => t.id === tx.id))
    ]

    // Calculate spending totals using shared function
    const { mySpending, totalSpending, categoryTotals } = calculateSpendingTotals(
      allTransactionsForCalculation,
      { isCreditCard, statementDay, monthOffset }
    )

    const chartData: ChartData[] = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
      percentage: mySpending > 0 ? Math.round((value / mySpending) * 100) : 0,
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
      total: mySpending,
      totalSpending,
      activeInstallments,
    })
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return errorResponse('Failed to fetch transactions')
  }
}
