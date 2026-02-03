import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, validateRuleCondition } from '@/lib/api-utils'
import type { RouteParams } from '@/types'

// PUT /api/rules/[id] - Update a rule
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { condition, conditionValue, category, priority, bankType } = body

    if (condition && !validateRuleCondition(condition)) {
      return errorResponse('Invalid condition type', 400)
    }

    // Handle bankType: null means "all banks", 'debit' or 'credit' for specific
    const validBankTypes = ['debit', 'credit']
    const bankTypeUpdate = bankType === null
      ? { bankType: null }
      : bankType && validBankTypes.includes(bankType)
        ? { bankType }
        : {}

    const rule = await prisma.rule.update({
      where: { id },
      data: {
        ...(condition && { condition }),
        ...(conditionValue && { conditionValue }),
        ...(category && { category }),
        ...(priority !== undefined && { priority }),
        ...bankTypeUpdate,
      },
    })

    return successResponse(rule)
  } catch (error) {
    console.error('Failed to update rule:', error)
    return errorResponse('Failed to update rule')
  }
}

// DELETE /api/rules/[id] - Delete a rule
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    await prisma.rule.delete({
      where: { id },
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error('Failed to delete rule:', error)
    return errorResponse('Failed to delete rule')
  }
}
