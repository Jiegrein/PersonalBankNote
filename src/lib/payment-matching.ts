/**
 * Determines which statement period a credit card payment is for.
 *
 * Payment Window: Statement Day → Due Day + 3 days
 * - Inside window → pays for PREVIOUS statement period
 * - Outside window → pays for CURRENT statement period
 *
 * Example (statement day 21, due day 5):
 * - Payment Feb 1 → in window (Jan 21 - Feb 8) → pays for Dec 21 - Jan 20
 * - Payment Feb 10 → outside window → pays for Jan 21 - Feb 20
 */

export interface StatementPeriod {
  startDate: Date
  endDate: Date
  label: string
}

export interface PaymentMatchResult {
  statementPeriod: StatementPeriod
  isForPreviousPeriod: boolean
}

/**
 * Get the statement period that a payment is for
 */
export function getPaymentStatementPeriod(
  paymentDate: Date,
  statementDay: number,
  dueDay: number,
  graceDays: number = 3
): PaymentMatchResult {
  const payment = new Date(paymentDate)
  const paymentYear = payment.getFullYear()
  const paymentMonth = payment.getMonth()
  const paymentDayOfMonth = payment.getDate()

  // Calculate the payment window for the current cycle
  // Statement day of current month to due day + grace of next month (or same month if due > statement)

  let windowStart: Date
  let windowEnd: Date
  let isForPreviousPeriod: boolean

  if (dueDay > statementDay) {
    // Due day is in the same month as statement day (e.g., statement 5, due 20)
    windowStart = new Date(paymentYear, paymentMonth, statementDay)
    windowEnd = new Date(paymentYear, paymentMonth, dueDay + graceDays)

    if (paymentDayOfMonth >= statementDay && paymentDayOfMonth <= dueDay + graceDays) {
      isForPreviousPeriod = true
    } else {
      isForPreviousPeriod = false
    }
  } else {
    // Due day is in the next month (e.g., statement 21, due 5)
    // Window is: statement day of prev month → due day + grace of current month

    // Check if payment is in the window
    if (paymentDayOfMonth >= statementDay) {
      // Payment is after statement day in current month
      // Window: current month statement day → next month due day + grace
      windowStart = new Date(paymentYear, paymentMonth, statementDay)
      windowEnd = new Date(paymentYear, paymentMonth + 1, dueDay + graceDays)
      isForPreviousPeriod = true
    } else if (paymentDayOfMonth <= dueDay + graceDays) {
      // Payment is before or on due day + grace in current month
      // This is for the previous month's statement
      windowStart = new Date(paymentYear, paymentMonth - 1, statementDay)
      windowEnd = new Date(paymentYear, paymentMonth, dueDay + graceDays)
      isForPreviousPeriod = true
    } else {
      // Payment is after due day + grace but before statement day
      // This is an early payment for the current period
      isForPreviousPeriod = false
    }
  }

  // Calculate the statement period based on whether it's for previous or current
  let periodStart: Date
  let periodEnd: Date

  if (isForPreviousPeriod) {
    // For previous period: find the statement that just closed
    if (paymentDayOfMonth >= statementDay) {
      // Statement closed this month
      periodStart = new Date(paymentYear, paymentMonth - 1, statementDay)
      periodEnd = new Date(paymentYear, paymentMonth, statementDay - 1)
    } else {
      // Statement closed last month
      periodStart = new Date(paymentYear, paymentMonth - 2, statementDay)
      periodEnd = new Date(paymentYear, paymentMonth - 1, statementDay - 1)
    }
  } else {
    // For current period (early payment)
    if (paymentDayOfMonth >= statementDay) {
      periodStart = new Date(paymentYear, paymentMonth, statementDay)
      periodEnd = new Date(paymentYear, paymentMonth + 1, statementDay - 1)
    } else {
      periodStart = new Date(paymentYear, paymentMonth - 1, statementDay)
      periodEnd = new Date(paymentYear, paymentMonth, statementDay - 1)
    }
  }

  // Format label
  const formatMonth = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const label = `${formatMonth(periodStart)} - ${formatMonth(periodEnd)}`

  return {
    statementPeriod: {
      startDate: periodStart,
      endDate: periodEnd,
      label,
    },
    isForPreviousPeriod,
  }
}

/**
 * Check if a payment date falls within the payment window for a statement
 */
export function isInPaymentWindow(
  paymentDate: Date,
  statementDay: number,
  dueDay: number,
  graceDays: number = 3
): boolean {
  const result = getPaymentStatementPeriod(paymentDate, statementDay, dueDay, graceDays)
  return result.isForPreviousPeriod
}
