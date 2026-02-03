import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-utils'

export async function GET() {
  try {
    const settings = await prisma.settings.findMany()

    const result: Record<string, string> = {}
    for (const setting of settings) {
      result[setting.key] = setting.value
    }

    return successResponse(result)
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return errorResponse('Failed to fetch settings')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return errorResponse('Missing required field: key', 400)
    }

    if (value === undefined || value === null) {
      return errorResponse('Missing required field: value', 400)
    }

    if (key === 'salary.monthlyAmount') {
      const numericValue = parseFloat(value)
      if (isNaN(numericValue)) {
        return errorResponse('Salary must be a valid number', 400)
      }
      if (numericValue <= 0) {
        return errorResponse('Salary must be a positive number', 400)
      }
    }

    const setting = await prisma.settings.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })

    return successResponse(setting)
  } catch (error) {
    console.error('Failed to update setting:', error)
    return errorResponse('Failed to update setting')
  }
}
