import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/banks - Get all banks
export async function GET() {
  try {
    const banks = await prisma.bank.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(banks)
  } catch (error) {
    console.error('Failed to fetch banks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch banks' },
      { status: 500 }
    )
  }
}

// POST /api/banks - Create a new bank
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, emailFilter, statementDay, color } = body

    // Validation
    if (!name || !emailFilter || !statementDay) {
      return NextResponse.json(
        { error: 'Missing required fields: name, emailFilter, statementDay' },
        { status: 400 }
      )
    }

    if (statementDay < 1 || statementDay > 31) {
      return NextResponse.json(
        { error: 'Statement day must be between 1 and 31' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailFilter)) {
      return NextResponse.json(
        { error: 'Invalid email filter format' },
        { status: 400 }
      )
    }

    const bank = await prisma.bank.create({
      data: {
        name,
        emailFilter,
        statementDay,
        color: color || '#3B82F6',
      },
    })

    return NextResponse.json(bank, { status: 201 })
  } catch (error) {
    console.error('Failed to create bank:', error)
    return NextResponse.json(
      { error: 'Failed to create bank' },
      { status: 500 }
    )
  }
}
