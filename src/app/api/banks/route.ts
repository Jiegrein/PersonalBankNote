import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, validateEmail, validateStatementDay } from '@/lib/api-utils'
import { CONFIG } from '@/lib/constants'
import { PARSER_OPTIONS } from '@/lib/parsers'

// GET /api/banks - Get all banks
export async function GET() {
  try {
    const banks = await prisma.bank.findMany({
      orderBy: { name: 'asc' },
    })
    return successResponse(banks)
  } catch (error) {
    console.error('Failed to fetch banks:', error)
    return errorResponse('Failed to fetch banks')
  }
}

// POST /api/banks - Create a new bank
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, emailFilter, statementDay, dueDay, color, parserType, bankType } = body

    if (!name || !emailFilter || !statementDay) {
      return errorResponse('Missing required fields: name, emailFilter, statementDay', 400)
    }

    if (!validateStatementDay(statementDay)) {
      return errorResponse('Statement day must be between 1 and 31', 400)
    }

    if (dueDay !== undefined && dueDay !== null && !validateStatementDay(dueDay)) {
      return errorResponse('Due day must be between 1 and 31', 400)
    }

    if (!validateEmail(emailFilter)) {
      return errorResponse('Invalid email filter format', 400)
    }

    const validParserTypes = PARSER_OPTIONS.map(p => p.value)
    const resolvedParserType = parserType && validParserTypes.includes(parserType)
      ? parserType
      : 'generic'

    const validBankTypes = ['debit', 'credit']
    const resolvedBankType = bankType && validBankTypes.includes(bankType)
      ? bankType
      : 'debit'

    const bank = await prisma.bank.create({
      data: {
        name,
        emailFilter,
        statementDay,
        dueDay: resolvedBankType === 'credit' ? (dueDay || null) : null,
        bankType: resolvedBankType,
        color: color || CONFIG.UI.CHART_COLORS[0],
        parserType: resolvedParserType,
      },
    })

    return successResponse(bank, 201)
  } catch (error) {
    console.error('Failed to create bank:', error)
    return errorResponse('Failed to create bank')
  }
}
