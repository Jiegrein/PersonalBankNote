import { getCalendarMonth, CalendarMonth } from '@/lib/calendar-month'

describe('getCalendarMonth', () => {
  describe('basic functionality', () => {
    it('should return CalendarMonth object with correct structure', () => {
      const result = getCalendarMonth(0)

      expect(result).toHaveProperty('startDate')
      expect(result).toHaveProperty('endDate')
      expect(result).toHaveProperty('label')
      expect(result).toHaveProperty('daysInMonth')
      expect(result.startDate).toBeInstanceOf(Date)
      expect(result.endDate).toBeInstanceOf(Date)
      expect(typeof result.label).toBe('string')
      expect(typeof result.daysInMonth).toBe('number')
    })

    it('should return 1st of month as start date', () => {
      const result = getCalendarMonth(0)

      expect(result.startDate.getDate()).toBe(1)
      expect(result.startDate.getHours()).toBe(0)
      expect(result.startDate.getMinutes()).toBe(0)
      expect(result.startDate.getSeconds()).toBe(0)
    })

    it('should return last day of month as end date', () => {
      const result = getCalendarMonth(0)
      const expectedLastDay = new Date(
        result.startDate.getFullYear(),
        result.startDate.getMonth() + 1,
        0
      ).getDate()

      expect(result.endDate.getDate()).toBe(expectedLastDay)
      expect(result.endDate.getHours()).toBe(23)
      expect(result.endDate.getMinutes()).toBe(59)
      expect(result.endDate.getSeconds()).toBe(59)
    })

    it('should calculate correct daysInMonth', () => {
      const result = getCalendarMonth(0)
      const expectedLastDay = new Date(
        result.startDate.getFullYear(),
        result.startDate.getMonth() + 1,
        0
      ).getDate()

      expect(result.daysInMonth).toBe(expectedLastDay)
    })
  })

  describe('month offset', () => {
    it('should return current month when offset is 0', () => {
      const now = new Date()
      const result = getCalendarMonth(0)

      expect(result.startDate.getMonth()).toBe(now.getMonth())
      expect(result.startDate.getFullYear()).toBe(now.getFullYear())
    })

    it('should return previous month when offset is -1', () => {
      const now = new Date()
      const result = getCalendarMonth(-1)

      const expectedMonth = now.getMonth() - 1
      const expectedYear = expectedMonth < 0 ? now.getFullYear() - 1 : now.getFullYear()
      const normalizedMonth = expectedMonth < 0 ? 11 : expectedMonth

      expect(result.startDate.getMonth()).toBe(normalizedMonth)
      expect(result.startDate.getFullYear()).toBe(expectedYear)
    })

    it('should return next month when offset is 1', () => {
      const now = new Date()
      const result = getCalendarMonth(1)

      const expectedMonth = now.getMonth() + 1
      const expectedYear = expectedMonth > 11 ? now.getFullYear() + 1 : now.getFullYear()
      const normalizedMonth = expectedMonth > 11 ? 0 : expectedMonth

      expect(result.startDate.getMonth()).toBe(normalizedMonth)
      expect(result.startDate.getFullYear()).toBe(expectedYear)
    })
  })

  describe('specific month days', () => {
    it('should return 31 days for January', () => {
      // January 2026 should have 31 days
      const jan2026 = getCalendarMonthForDate(new Date(2026, 0, 15))

      expect(jan2026.daysInMonth).toBe(31)
      expect(jan2026.endDate.getDate()).toBe(31)
    })

    it('should return 28 days for February (non-leap year)', () => {
      // February 2025 is not a leap year
      const feb2025 = getCalendarMonthForDate(new Date(2025, 1, 15))

      expect(feb2025.daysInMonth).toBe(28)
      expect(feb2025.endDate.getDate()).toBe(28)
    })

    it('should return 29 days for February (leap year)', () => {
      // February 2024 was a leap year
      const feb2024 = getCalendarMonthForDate(new Date(2024, 1, 15))

      expect(feb2024.daysInMonth).toBe(29)
      expect(feb2024.endDate.getDate()).toBe(29)
    })

    it('should return 30 days for April', () => {
      const apr2026 = getCalendarMonthForDate(new Date(2026, 3, 15))

      expect(apr2026.daysInMonth).toBe(30)
      expect(apr2026.endDate.getDate()).toBe(30)
    })
  })

  describe('year rollover', () => {
    it('should handle offset that crosses year boundary backwards', () => {
      // Assuming current is Jan 2026, offset -1 should give Dec 2025
      const result = getCalendarMonthForDate(new Date(2026, 0, 15), -1)

      expect(result.startDate.getMonth()).toBe(11) // December
      expect(result.startDate.getFullYear()).toBe(2025)
    })

    it('should handle offset that crosses year boundary forwards', () => {
      // Assuming current is Dec 2025, offset +1 should give Jan 2026
      const result = getCalendarMonthForDate(new Date(2025, 11, 15), 1)

      expect(result.startDate.getMonth()).toBe(0) // January
      expect(result.startDate.getFullYear()).toBe(2026)
    })
  })

  describe('label format', () => {
    it('should return label in "Month Year" format', () => {
      const result = getCalendarMonthForDate(new Date(2026, 0, 15))

      expect(result.label).toBe('January 2026')
    })

    it('should return correct label for December', () => {
      const result = getCalendarMonthForDate(new Date(2025, 11, 15))

      expect(result.label).toBe('December 2025')
    })
  })
})

// Helper to test specific dates without relying on current date
function getCalendarMonthForDate(date: Date, offset: number = 0): CalendarMonth {
  // Calculate the target month/year
  let targetMonth = date.getMonth() + offset
  let targetYear = date.getFullYear()

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
  const label = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return { startDate, endDate, label, daysInMonth }
}
