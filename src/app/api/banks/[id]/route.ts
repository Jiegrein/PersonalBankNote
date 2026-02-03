import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, validateEmail, validateStatementDay } from '@/lib/api-utils'
import { PARSER_OPTIONS } from '@/lib/parsers'
import type { RouteParams } from '@/types'

// GET /api/banks/[id] - Get a single bank
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const bank = await prisma.bank.findUnique({
      where: { id },
    })

    if (!bank) {
      return errorResponse('Bank not found', 404)
    }

    return successResponse(bank)
  } catch (error) {
    console.error('Failed to fetch bank:', error)
    return errorResponse('Failed to fetch bank')
  }
}

// PUT /api/banks/[id] - Update a bank
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, emailFilter, statementDay, dueDay, color, parserType, bankType } = body

    if (statementDay !== undefined && !validateStatementDay(statementDay)) {
      return errorResponse('Statement day must be between 1 and 31', 400)
    }

    if (dueDay !== undefined && dueDay !== null && !validateStatementDay(dueDay)) {
      return errorResponse('Due day must be between 1 and 31', 400)
    }

    if (emailFilter && !validateEmail(emailFilter)) {
      return errorResponse('Invalid email filter format', 400)
    }

    const validParserTypes = PARSER_OPTIONS.map(p => p.value)
    const resolvedParserType = parserType && validParserTypes.includes(parserType)
      ? parserType
      : undefined

    const validBankTypes = ['debit', 'credit']
    const resolvedBankType = bankType && validBankTypes.includes(bankType)
      ? bankType
      : undefined

    // Handle dueDay update
    const dueDayUpdate = dueDay !== undefined ? { dueDay: dueDay || null } : {}

    const bank = await prisma.bank.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(emailFilter && { emailFilter }),
        ...(statementDay && { statementDay }),
        ...dueDayUpdate,
        ...(color && { color }),
        ...(resolvedParserType && { parserType: resolvedParserType }),
        ...(resolvedBankType && { bankType: resolvedBankType }),
      },
    })

    return successResponse(bank)
  } catch (error) {
    console.error('Failed to update bank:', error)
    return errorResponse('Failed to update bank')
  }
}

// DELETE /api/banks/[id] - Delete a bank
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    await prisma.bank.delete({
      where: { id },
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error('Failed to delete bank:', error)
    return errorResponse('Failed to delete bank')
  }
}
