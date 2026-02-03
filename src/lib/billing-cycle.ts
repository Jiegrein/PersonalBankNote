export interface BillingPeriod {
  label: string
  startDate: Date
  endDate: Date
}

export function getBillingPeriod(statementDay: number, monthOffset: number = 0, referenceDate?: Date): BillingPeriod {
  const now = referenceDate || new Date()
  const currentDay = now.getDate()

  // First determine the base period (what period are we in today?)
  // On statement day itself, show the period that just ended (more useful to see completed statement)
  let baseMonth = now.getMonth()
  if (currentDay <= statementDay) {
    // We're on or before the statement day, show the previous month's period
    baseMonth -= 1
  }

  // Then apply the offset to navigate months
  let year = now.getFullYear()
  let month = baseMonth + monthOffset

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
