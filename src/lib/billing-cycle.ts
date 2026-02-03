export interface BillingPeriod {
  label: string
  startDate: Date
  endDate: Date
}

export function getBillingPeriod(statementDay: number, monthOffset: number = 0, referenceDate?: Date): BillingPeriod {
  const now = referenceDate || new Date()
  const currentDay = now.getDate()

  // Determine the base month
  let year = now.getFullYear()
  let month = now.getMonth() + monthOffset

  // If we're before the statement day, we're in the previous period
  if (currentDay < statementDay && monthOffset === 0) {
    month -= 1
  }

  // Handle year rollover
  while (month < 0) {
    month += 12
    year -= 1
  }
  while (month > 11) {
    month -= 12
    year += 1
  }

  // Calculate start date (statement day of this month)
  const startDate = new Date(year, month, statementDay)

  // Calculate end date (day before statement day of next month)
  let endMonth = month + 1
  let endYear = year
  if (endMonth > 11) {
    endMonth = 0
    endYear += 1
  }
  const endDate = new Date(endYear, endMonth, statementDay - 1, 23, 59, 59)

  // Format label by end date month (when statement is received)
  // e.g., Dec 21 - Jan 20 → "January 2026" (statement received in January)
  const label = endDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return { label, startDate, endDate }
}

export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  if (currency === 'IDR') {
    return `Rp ${amount.toLocaleString('id-ID')}`
  }
  return `${currency} ${amount.toLocaleString()}`
}
