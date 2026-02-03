import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, validateRuleCondition } from '@/lib/api-utils'

// GET /api/rules - Get all rules
export async function GET() {
  try {
    const rules = await prisma.rule.findMany({
      orderBy: { priority: 'desc' },
    })
    return successResponse(rules)
  } catch (error) {
    console.error('Failed to fetch rules:', error)
    return errorResponse('Failed to fetch rules')
  }
}

// POST /api/rules - Create a new rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { condition, conditionValue, category, priority, bankType } = body

    if (!condition || !conditionValue || !category) {
      return errorResponse('Missing required fields', 400)
    }

    if (!validateRuleCondition(condition)) {
      return errorResponse('Invalid condition type', 400)
    }

    // Validate bankType if provided
    const validBankTypes = ['debit', 'credit']
    const resolvedBankType = bankType && validBankTypes.includes(bankType) ? bankType : null

    const rule = await prisma.rule.create({
      data: {
        condition,
        conditionValue,
        category,
        priority: priority || 0,
        bankType: resolvedBankType,
      },
    })

    return successResponse(rule, 201)
  } catch (error) {
    console.error('Failed to create rule:', error)
    return errorResponse('Failed to create rule')
  }
}
