import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/rules - Get all rules
export async function GET() {
  try {
    const rules = await prisma.rule.findMany({
      orderBy: { priority: 'desc' },
    })
    return NextResponse.json(rules)
  } catch (error) {
    console.error('Failed to fetch rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rules' },
      { status: 500 }
    )
  }
}

// POST /api/rules - Create a new rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { condition, conditionValue, category, priority } = body

    if (!condition || !conditionValue || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const validConditions = ['contains', 'startsWith', 'endsWith', 'equals']
    if (!validConditions.includes(condition)) {
      return NextResponse.json(
        { error: 'Invalid condition type' },
        { status: 400 }
      )
    }

    const rule = await prisma.rule.create({
      data: {
        condition,
        conditionValue,
        category,
        priority: priority || 0,
      },
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error('Failed to create rule:', error)
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    )
  }
}
