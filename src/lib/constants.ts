export const CONFIG = {
  UI: {
    MAX_VISIBLE_BANKS: 4,
    CHART_COLORS: [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#6B7280', // gray
    ],
  },
  API: {
    DEFAULT_EMAIL_FETCH_LIMIT: 50,
    DEFAULT_TRANSACTION_LIMIT: 50,
  },
  SYNC: {
    DEFAULT_LOOKBACK_DAYS: 30,
  },
  VALIDATION: {
    VALID_CONDITIONS: ['contains', 'startsWith', 'endsWith', 'equals'] as const,
    STATEMENT_DAY_MIN: 1,
    STATEMENT_DAY_MAX: 31,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
} as const

// Type for valid conditions
export type ValidCondition = typeof CONFIG.VALIDATION.VALID_CONDITIONS[number]
