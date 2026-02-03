import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchEmails } from '@/lib/microsoft-graph'
import { parseTransaction } from '@/lib/parsers'
import { applyRules, Rule } from '@/lib/rules-engine'
import { PreviewTransaction } from '@/types'

interface PreviewRequestBody {
  bankId: string
  preview: true
}

interface CommitRequestBody {
  bankId: string
  commit: true
  transactions: PreviewTransaction[]
}

type RequestBody = PreviewRequestBody | CommitRequestBody | { bankId: string }

// POST /api/sync - Sync emails for a bank (preview or commit mode)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 401 }
      )
    }

    const body: RequestBody = await request.json()
    const { bankId } = body

    if (!bankId) {
      return NextResponse.json(
        { error: 'Missing bankId' },
        { status: 400 }
      )
    }

    const bank = await prisma.bank.findUnique({
      where: { id: bankId },
    })

    if (!bank) {
      return NextResponse.json(
        { error: 'Bank not found' },
        { status: 404 }
      )
    }

    // Handle commit mode - save selected transactions
    if ('commit' in body && body.commit) {
      return await handleCommit(bankId, body.transactions)
    }

    // Preview mode (default) - fetch and return parsed transactions
    return await handlePreview(session.accessToken, bank)
  } catch (error) {
    console.error('Sync failed:', error)
    const message = (error as Error).message

    // Detect expired/invalid Microsoft token
    if (message.includes('401') || message.includes('InvalidAuthenticationToken')) {
      return NextResponse.json(
        { error: 'Session expired', code: 'TOKEN_EXPIRED' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Sync failed', details: message },
      { status: 500 }
    )
  }
}

async function handlePreview(
  accessToken: string,
  bank: { id: string; name: string; emailFilter: string; parserType: string; bankType: string }
) {
  const lastSync = await prisma.syncLog.findFirst({
    where: { bankId: bank.id },
    orderBy: { syncedAt: 'desc' },
  })

  const since = lastSync?.syncedAt || new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

  const emails = await fetchEmails(accessToken, bank.emailFilter, since)

  const rules = await prisma.rule.findMany({
    orderBy: { priority: 'desc' },
  })

  const emailIds = emails.map(e => e.id)
  const existingTransactions = await prisma.transaction.findMany({
    where: { emailId: { in: emailIds } },
    select: { emailId: true },
  })
  const existingEmailIds = new Set(existingTransactions.map(t => t.emailId))

  const previewTransactions: PreviewTransaction[] = emails
    .filter(email => !existingEmailIds.has(email.id))
    .map((email, index) => {
      const parsed = parseTransaction(bank.parserType, email.content)
      const textToMatch = `${parsed.merchant} ${email.subject} ${email.content}`
      const category = applyRules(textToMatch, rules as Rule[], bank.bankType)

      return {
        tempId: `preview-${index}-${email.id.slice(0, 8)}`,
        emailId: email.id,
        emailSubject: email.subject,
        transactionType: parsed.transactionType,
        merchant: parsed.merchant,
        amount: parsed.amount,
        currency: parsed.currency,
        idrAmount: parsed.idrAmount,
        category,
        date: email.receivedAt,
        rawContent: email.content,
      }
    })

  return NextResponse.json({
    success: true,
    bankId: bank.id,
    bankName: bank.name,
    previewTransactions,
    totalFound: emails.length,
    alreadySynced: existingEmailIds.size,
  })
}

async function handleCommit(bankId: string, transactions: PreviewTransaction[]) {
  if (!transactions || transactions.length === 0) {
    return NextResponse.json(
      { error: 'No transactions to import' },
      { status: 400 }
    )
  }

  const transactionsToCreate = transactions.map(t => ({
    bankId,
    emailId: t.emailId,
    rawContent: t.rawContent,
    transactionType: t.transactionType,
    amount: t.amount,
    currency: t.currency,
    idrAmount: t.idrAmount,
    merchant: t.merchant,
    category: t.category,
    date: new Date(t.date),
  }))

  await prisma.transaction.createMany({
    data: transactionsToCreate,
  })

  await prisma.syncLog.create({
    data: {
      bankId,
      emailCount: transactionsToCreate.length,
    },
  })

  return NextResponse.json({
    success: true,
    imported: transactionsToCreate.length,
  })
}
