import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-utils'

// GET /api/categories - Get all unique categories with colors
export async function GET() {
  try {
    // Get standalone categories from Category table with colors
    const standaloneCategories = await prisma.category.findMany({
      select: { name: true, color: true },
    })

    // Create a map of category name to color
    const categoryColorMap = new Map(
      standaloneCategories.map(c => [c.name, c.color])
    )

    // Get categories from transactions
    const transactionCategories = await prisma.transaction.findMany({
      select: { category: true },
      distinct: ['category'],
    })

    // Get categories from rules
    const ruleCategories = await prisma.rule.findMany({
      select: { category: true },
      distinct: ['category'],
    })

    // Combine and dedupe all category names
    const allCategoryNames = new Set([
      ...standaloneCategories.map(c => c.name),
      ...transactionCategories.map(t => t.category),
      ...ruleCategories.map(r => r.category),
    ])

    // Build categories with colors (use saved color or default)
    const defaultColor = '#6B7280'
    const categories = Array.from(allCategoryNames)
      .sort()
      .map(name => ({
        name,
        color: categoryColorMap.get(name) || defaultColor,
      }))

    return successResponse(categories)
  } catch (error) {
    console.error('Failed to fetch categories:', error)
    return errorResponse('Failed to fetch categories')
  }
}

// POST /api/categories - Create a standalone category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, color } = body

    if (!name) {
      return errorResponse('Category name is required', 400)
    }

    // Check if already exists
    const existing = await prisma.category.findUnique({
      where: { name },
    })

    if (existing) {
      return errorResponse('Category already exists', 400)
    }

    const category = await prisma.category.create({
      data: {
        name,
        color: color || '#6B7280',
      },
    })

    return successResponse(category, 201)
  } catch (error) {
    console.error('Failed to create category:', error)
    return errorResponse('Failed to create category')
  }
}
