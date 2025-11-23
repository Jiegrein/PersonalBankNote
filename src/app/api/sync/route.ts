import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchEmails } from '@/lib/microsoft-graph'
import { parseTransaction } from '@/lib/parser'
import { applyRules, Rule } from '@/lib/rules-engine'

// POST /api/sync - Sync emails for a bank
export async function POST(request: NextRequest) {
  try {
    // Get session with access token
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated or missing access token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { bankId } = body

    if (!bankId) {
      return NextResponse.json(
        { error: 'Missing bankId' },
        { status: 400 }
      )
    }

    // Get bank details
    const bank = await prisma.bank.findUnique({
      where: { id: bankId },
    })

    if (!bank) {
      return NextResponse.json(
        { error: 'Bank not found' },
        { status: 404 }
      )
    }

    // Get last sync time for this bank
    const lastSync = await prisma.syncLog.findFirst({
      where: { bankId },
      orderBy: { syncedAt: 'desc' },
    })

    // Fetch emails since last sync (or last 30 days if first sync)
    const since = lastSync?.syncedAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const emails = await fetchEmails(
      session.accessToken,
      bank.emailFilter,
      since
    )

    // Get all rules for categorization
    const rules = await prisma.rule.findMany({
      orderBy: { priority: 'desc' },
    })

    // Store and parse emails
    let newCount = 0

    for (const email of emails) {
      // Check if email already exists
      const existing = await prisma.transaction.findFirst({
        where: { emailId: email.id },
      })

      if (!existing) {
        // Parse the email content
        const parsed = parseTransaction(email.content)

        // Apply classification rules
        const textToMatch = `${parsed.merchant} ${email.subject} ${email.content}`
        const category = applyRules(textToMatch, rules as Rule[])

        await prisma.transaction.create({
          data: {
            bankId,
            emailId: email.id,
            rawContent: email.content,
            amount: parsed.amount,
            currency: parsed.currency,
            idrAmount: parsed.idrAmount,
            merchant: parsed.merchant,
            category,
            date: email.receivedAt,
          },
        })
        newCount++
      }
    }

    // Log sync
    await prisma.syncLog.create({
      data: {
        bankId,
        emailCount: newCount,
      },
    })

    return NextResponse.json({
      success: true,
      emailsFound: emails.length,
      newTransactions: newCount,
    })
  } catch (error) {
    console.error('Sync failed:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}
