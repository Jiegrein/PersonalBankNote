import { NextResponse } from 'next/server'
import { CONFIG } from './constants'

/**
 * Create a success response with data
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Create an error response with message
 */
export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  return CONFIG.VALIDATION.EMAIL_REGEX.test(email)
}

/**
 * Validate statement day is within valid range (1-31)
 */
export function validateStatementDay(day: number): boolean {
  return (
    Number.isInteger(day) &&
    day >= CONFIG.VALIDATION.STATEMENT_DAY_MIN &&
    day <= CONFIG.VALIDATION.STATEMENT_DAY_MAX
  )
}

/**
 * Validate rule condition is a valid type
 */
export function validateRuleCondition(condition: string): boolean {
  return (CONFIG.VALIDATION.VALID_CONDITIONS as readonly string[]).includes(condition)
}

/**
 * Parse pagination params from URL search params
 */
export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get('limit') || String(CONFIG.API.DEFAULT_TRANSACTION_LIMIT), 10))
  )
  const skip = (page - 1) * limit

  return { page, limit, skip }
}
