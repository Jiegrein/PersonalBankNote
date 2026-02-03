import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-utils'
import { INSTALLMENT_OPTIONS } from '@/lib/installments'
import type { RouteParams } from '@/types'

// PATCH /api/transactions/[id] - Update a transaction
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { category, installmentTerms } = body

    // Build update data
    const updateData: { category?: string; installmentTerms?: number | null } = {}

    if (category !== undefined) {
      updateData.category = category
    }

    if (installmentTerms !== undefined) {
      // Validate installment terms
      if (installmentTerms === null || installmentTerms === 1) {
        updateData.installmentTerms = null // Full payment
      } else if (INSTALLMENT_OPTIONS.includes(installmentTerms)) {
        updateData.installmentTerms = installmentTerms
      } else {
        return errorResponse('Invalid installment terms. Must be 1, 3, 6, 12, or 24', 400)
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No valid fields to update', 400)
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
    })

    return successResponse(transaction)
  } catch (error) {
    console.error('Failed to update transaction:', error)
    return errorResponse('Failed to update transaction')
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    await prisma.transaction.delete({
      where: { id },
    })

    return successResponse({ success: true })
  } catch (error) {
    console.error('Failed to delete transaction:', error)
    return errorResponse('Failed to delete transaction')
  }
}
