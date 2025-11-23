import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: { id: string }
}

// GET /api/banks/[id] - Get a single bank
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const bank = await prisma.bank.findUnique({
      where: { id: params.id },
    })

    if (!bank) {
      return NextResponse.json(
        { error: 'Bank not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(bank)
  } catch (error) {
    console.error('Failed to fetch bank:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bank' },
      { status: 500 }
    )
  }
}

// PUT /api/banks/[id] - Update a bank
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { name, emailFilter, statementDay, color } = body

    // Validation
    if (statementDay !== undefined && (statementDay < 1 || statementDay > 31)) {
      return NextResponse.json(
        { error: 'Statement day must be between 1 and 31' },
        { status: 400 }
      )
    }

    if (emailFilter) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(emailFilter)) {
        return NextResponse.json(
          { error: 'Invalid email filter format' },
          { status: 400 }
        )
      }
    }

    const bank = await prisma.bank.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(emailFilter && { emailFilter }),
        ...(statementDay && { statementDay }),
        ...(color && { color }),
      },
    })

    return NextResponse.json(bank)
  } catch (error) {
    console.error('Failed to update bank:', error)
    return NextResponse.json(
      { error: 'Failed to update bank' },
      { status: 500 }
    )
  }
}

// DELETE /api/banks/[id] - Delete a bank
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await prisma.bank.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete bank:', error)
    return NextResponse.json(
      { error: 'Failed to delete bank' },
      { status: 500 }
    )
  }
}
