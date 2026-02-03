// Database models (mirror Prisma but explicit for frontend use)
export type BankType = 'debit' | 'credit'

export interface Bank {
  id: string
  name: string
  emailFilter: string
  statementDay: number
  bankType: BankType
  color: string
  createdAt?: Date
  updatedAt?: Date
}

// Simplified Bank for context (without emailFilter)
export interface BankSummary {
  id: string
  name: string
  statementDay: number
  color: string
}

export interface Transaction {
  id: string
  bankId: string
  emailId: string
  amount: number
  currency: string
  idrAmount: number | null
  merchant: string
  category: string
  date: string | Date
  installmentTerms?: number | null
  rawContent?: string
  bank?: { name: string; color: string; statementDay?: number }
  createdAt?: Date
  updatedAt?: Date
}

export interface Rule {
  id: string
  condition: RuleCondition
  conditionValue: string
  category: string
  priority: number
  bankType?: string | null // null = all banks, 'debit' or 'credit' = specific type only
  createdAt?: Date
  updatedAt?: Date
}

export type RuleCondition = 'contains' | 'startsWith' | 'endsWith' | 'equals'

export interface Category {
  id: string
  name: string
  color: string
  createdAt?: Date
  updatedAt?: Date
}

export interface SyncLog {
  id: string
  bankId: string
  syncedAt: Date
  emailCount: number
}

// Chart data for dashboard
export interface ChartData {
  name: string
  value: number
  percentage: number
}

// API types
export interface ApiResponse<T> {
  data?: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// Route params for dynamic routes (Next.js 16+ uses Promise for params)
export interface RouteParams {
  params: Promise<{ id: string }>
}

// Email types for sync
export interface EmailMessage {
  id: string
  subject: string
  content: string
  receivedAt: Date
}

// Parsed transaction from email
export interface ParsedTransaction {
  amount: number
  currency: string
  idrAmount: number | null
  merchant: string
}

// Preview transaction for sync preview modal
export interface PreviewTransaction {
  tempId: string
  emailId: string
  emailSubject: string
  transactionType: string
  merchant: string
  amount: number
  currency: string
  idrAmount: number | null
  category: string
  date: Date | string
  rawContent: string
}

// Billing period
export interface BillingPeriod {
  start: Date
  end: Date
  label: string
}

// Salary Dashboard types
export interface SalaryDashboardPeriod {
  startDate: string
  endDate: string
  label: string
}

export interface SalaryProjections {
  daysElapsed: number
  daysRemaining: number
  averageDailySpending: number
  projectedMonthEndSpending: number
  projectedRemainingBalance: number
  dailyBudgetRemaining: number
}

export interface SalaryCategoryBreakdown {
  name: string
  value: number
  percentage: number
  color: string
}

export interface SalaryDailySpending {
  date: string
  amount: number
  cumulativeAmount: number
}

export interface SalaryBankSummary {
  bankId: string
  bankName: string
  bankType: BankType
  totalSpending: number
}

export interface CcPaymentDetail {
  bankId: string
  bankName: string
  statementPeriod: string
  amount: number
}

export interface CcPaymentMade {
  bankName: string
  merchant: string
  date: string
  amount: number
  forCc?: string
}

export interface InstallmentInfo {
  transactionId: string
  merchant: string
  totalAmount: number
  monthlyAmount: number
  terms: number
  currentInstallment: number
  isActive: boolean
  startDate: string | Date
  transactionDate: string | Date
}

export interface SalaryDashboardData {
  period: SalaryDashboardPeriod
  salary: number
  debitSpending: number
  ccPaymentDue: number
  ccPaymentDetails: CcPaymentDetail[]
  ccPaymentsMade: CcPaymentMade[]
  totalSpending: number
  remainingBalance: number
  categoryBreakdown: SalaryCategoryBreakdown[]
  dailySpending: SalaryDailySpending[]
  projections: SalaryProjections
  bankSummary: SalaryBankSummary[]
  activeInstallments: InstallmentInfo[]
}
