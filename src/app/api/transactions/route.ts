import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/transactions - Get transactions with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bankId = searchParams.get('bankId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}

    if (bankId) {
      where.bankId = bankId
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        bank: {
          select: { name: true, color: true },
        },
      },
    })

    // Calculate category totals for chart
    const categoryTotals: Record<string, number> = {}
    let total = 0

    for (const tx of transactions) {
      if (tx.idrAmount) {
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.idrAmount
        total += tx.idrAmount
      }
    }

    const chartData = Object.entries(categoryTotals).map(([name, value]) => ({
      name,
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))

    return NextResponse.json({
      transactions,
      chartData,
      total,
    })
  } catch (error) {
    console.error('Failed to fetch transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
