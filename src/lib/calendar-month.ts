export interface CalendarMonth {
  startDate: Date
  endDate: Date
  label: string
  daysInMonth: number
}

export function getCalendarMonth(monthOffset: number = 0): CalendarMonth {
  const now = new Date()
  let targetMonth = now.getMonth() + monthOffset
  let targetYear = now.getFullYear()

  while (targetMonth < 0) {
    targetMonth += 12
    targetYear -= 1
  }
  while (targetMonth > 11) {
    targetMonth -= 12
    targetYear += 1
  }

  const startDate = new Date(targetYear, targetMonth, 1, 0, 0, 0)
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
  const endDate = new Date(targetYear, targetMonth, daysInMonth, 23, 59, 59)

  const label = startDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return { startDate, endDate, label, daysInMonth }
}
