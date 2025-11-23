import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: { id: string }
}

// PUT /api/rules/[id] - Update a rule
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const body = await request.json()
    const { condition, conditionValue, category, priority } = body

    const rule = await prisma.rule.update({
      where: { id: params.id },
      data: {
        ...(condition && { condition }),
        ...(conditionValue && { conditionValue }),
        ...(category && { category }),
        ...(priority !== undefined && { priority }),
      },
    })

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Failed to update rule:', error)
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    )
  }
}

// DELETE /api/rules/[id] - Delete a rule
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await prisma.rule.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete rule' },
      { status: 500 }
    )
  }
}
