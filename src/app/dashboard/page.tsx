'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  MoreHorizontal,
  CircleDollarSign,
  CreditCard,
  Banknote,
  Check,
  ArrowUpDown,
  Calendar,
} from 'lucide-react'
import { getBillingPeriod, formatCurrency } from '@/lib/billing-cycle'
import { useBankContext } from '@/contexts/BankContext'
import { BankSelectionModal } from '@/components/BankSelectionModal'
import { SalarySettingsModal } from '@/components/SalarySettingsModal'
import type { SalaryDashboardData, InstallmentInfo } from '@/types'

const MAX_VISIBLE_BANKS_MOBILE = 3
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280']

// Hook to detect if on mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}

interface Transaction {
  id: string
  transactionType: string
  amount: number
  currency: string
  idrAmount: number | null
  merchant: string
  category: string
  date: string
  installmentTerms?: number | null
  bank: { name: string; color: string; bankType?: string }
}

interface ChartData {
  name: string
  value: number
  percentage: number
}

type ViewMode = 'budget' | string // 'budget' or bankId

export default function DashboardPage() {
  const { data: session } = useSession()
  const { banks } = useBankContext()
  const isMobile = useIsMobile()
  const [viewMode, setViewMode] = useState<ViewMode>('budget')
  const [monthOffset, setMonthOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showBankModal, setShowBankModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  // Budget view state
  const [budgetData, setBudgetData] = useState<SalaryDashboardData | null>(null)
  const [budgetError, setBudgetError] = useState<string | null>(null)

  // Bank breakdown view state
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const [bankInstallments, setBankInstallments] = useState<InstallmentInfo[]>([])

  const selectedBank = viewMode !== 'budget' ? banks.find(b => b.id === viewMode) : null

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories')
        if (res.ok) {
          const data = await res.json()
          setCategories(data)
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])

  // Fetch data based on view mode
  useEffect(() => {
    if (viewMode === 'budget') {
      fetchBudgetData()
    } else if (selectedBank) {
      fetchBankData()
    }
  }, [viewMode, monthOffset, selectedBank])

  async function fetchBudgetData() {
    setLoading(true)
    setBudgetError(null)
    try {
      const res = await fetch(`/api/salary-dashboard?monthOffset=${monthOffset}`)
      if (res.ok) {
        const data = await res.json()
        setBudgetData(data)
      } else {
        setBudgetError('Failed to load budget data')
        console.error('Budget API returned:', res.status)
      }
    } catch (error) {
      setBudgetError('Failed to load budget data')
      console.error('Failed to fetch budget data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchBankData() {
    if (!selectedBank) return

    setLoading(true)
    try {
      const period = getBillingPeriod(selectedBank.statementDay, monthOffset)
      const params = new URLSearchParams({
        bankId: selectedBank.id,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        monthOffset: String(monthOffset),
      })

      const res = await fetch(`/api/transactions?${params}`)
      const data = await res.json()

      if (res.ok && data) {
        setTransactions(Array.isArray(data.transactions) ? data.transactions : [])
        setChartData(Array.isArray(data.chartData) ? data.chartData : [])
        setTotal(data.total || 0)
        setBankInstallments(Array.isArray(data.activeInstallments) ? data.activeInstallments : [])
      } else {
        setTransactions([])
        setChartData([])
        setTotal(0)
        setBankInstallments([])
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      setTransactions([])
      setChartData([])
      setTotal(0)
      setBankInstallments([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSalary(newSalary: number) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'salary.monthlyAmount', value: String(newSalary) }),
    })
    if (res.ok) {
      fetchBudgetData()
    } else {
      throw new Error('Failed to save')
    }
  }

  async function handleCategoryChange(transactionIds: string[], newCategory: string) {
    // Update all selected transactions
    const updates = transactionIds.map(id =>
      fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory }),
      })
    )
    await Promise.all(updates)

    // Update local state
    const idSet = new Set(transactionIds)
    setTransactions(prev =>
      prev.map(tx =>
        idSet.has(tx.id) ? { ...tx, category: newCategory } : tx
      )
    )
    // Refresh to update chart
    fetchBankData()
  }

  async function handleInstallmentChange(transactionId: string, terms: number | null) {
    await fetch(`/api/transactions/${transactionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installmentTerms: terms }),
    })

    // Update local state
    setTransactions(prev =>
      prev.map(tx =>
        tx.id === transactionId ? { ...tx, installmentTerms: terms } : tx
      )
    )
    // Refresh to update totals
    fetchBankData()
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const allOptions = ['budget', ...banks.map(b => b.id)]
      const currentIndex = allOptions.indexOf(viewMode)

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const nextIndex = (currentIndex + 1) % allOptions.length
        setViewMode(allOptions[nextIndex])
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prevIndex = currentIndex - 1 < 0 ? allOptions.length - 1 : currentIndex - 1
        setViewMode(allOptions[prevIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [banks, viewMode])

  if (!session) {
    return (
      <div className="w-full px-4 md:w-[90%] lg:w-[80%] mx-auto py-8">
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Please sign in to view dashboard.</p>
          <Link href="/" className="text-blue-400 hover:underline">Go to home</Link>
        </div>
      </div>
    )
  }

  const visibleBanks = isMobile ? banks.slice(0, MAX_VISIBLE_BANKS_MOBILE) : banks
  const hasMoreBanks = isMobile && banks.length > MAX_VISIBLE_BANKS_MOBILE

  // Get period label
  const periodLabel = viewMode === 'budget'
    ? budgetData?.period.label || 'Loading...'
    : selectedBank
      ? getBillingPeriod(selectedBank.statementDay, monthOffset).label
      : 'Select bank'

  return (
    <>
      <div className="w-full px-4 md:w-[90%] lg:w-[80%] mx-auto py-4 md:py-6">
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
          {/* Pills */}
          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide w-full lg:w-auto">
            {/* Budget Pill */}
            <button
              onClick={() => setViewMode('budget')}
              role="tab"
              aria-selected={viewMode === 'budget'}
              className={`
                flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full text-xs md:text-sm font-semibold
                whitespace-nowrap transition-all duration-200 flex-shrink-0
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900
                ${viewMode === 'budget'
                  ? 'bg-green-600 text-white shadow-lg shadow-green-500/20 hover:bg-green-500 transform hover:scale-105'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:border-gray-600 hover:-translate-y-0.5'
                }
              `}
            >
              <CircleDollarSign className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Budget</span>
              {loading && viewMode === 'budget' && (
                <RefreshCw className="w-3 h-3 animate-spin ml-1" />
              )}
            </button>

            {/* Bank Pills */}
            {visibleBanks.map((bank) => (
              <button
                key={bank.id}
                onClick={() => setViewMode(bank.id)}
                role="tab"
                aria-selected={viewMode === bank.id}
                className={`
                  flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full text-xs md:text-sm font-semibold
                  whitespace-nowrap transition-all duration-200 flex-shrink-0
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900
                  ${viewMode === bank.id
                    ? 'bg-green-600 text-white shadow-lg shadow-green-500/20 hover:bg-green-500 transform hover:scale-105'
                    : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:border-gray-600 hover:-translate-y-0.5'
                  }
                `}
              >
                <div
                  className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ring-2 ring-white/20"
                  style={{ backgroundColor: bank.color }}
                />
                <span>{bank.name}</span>
                {loading && viewMode === bank.id && (
                  <RefreshCw className="w-3 h-3 animate-spin ml-1" />
                )}
              </button>
            ))}

            {hasMoreBanks && (
              <button
                onClick={() => setShowBankModal(true)}
                className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full text-xs md:text-sm font-semibold
                           bg-gray-800 text-gray-300 border border-gray-700
                           hover:bg-gray-700 hover:border-gray-600 hover:-translate-y-0.5
                           transition-all duration-200 flex-shrink-0"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span>More ({banks.length - MAX_VISIBLE_BANKS_MOBILE})</span>
              </button>
            )}
          </div>

          {/* Period Navigator + Settings */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
              <button
                onClick={() => setMonthOffset(monthOffset - 1)}
                className="p-1.5 md:p-2 hover:bg-gray-700 rounded-md transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 md:px-4 min-w-[120px] md:min-w-[140px] text-center text-xs md:text-sm font-medium">
                {periodLabel}
              </span>
              <button
                onClick={() => setMonthOffset(monthOffset + 1)}
                disabled={monthOffset >= 0}
                className="p-1.5 md:p-2 hover:bg-gray-700 rounded-md transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {viewMode === 'budget' && (
              <button
                onClick={() => setShowSettingsModal(true)}
                className="p-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 rounded-lg transition-colors"
                title="Salary Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : viewMode === 'budget' ? (
          <BudgetView data={budgetData} error={budgetError} />
        ) : (
          <BankBreakdownView
            transactions={transactions}
            chartData={chartData}
            total={total}
            bankName={selectedBank?.name || ''}
            bankType={selectedBank?.bankType || 'debit'}
            categories={categories}
            activeInstallments={bankInstallments}
            onCategoryChange={handleCategoryChange}
            onInstallmentChange={handleInstallmentChange}
          />
        )}
      </div>

      <BankSelectionModal
        isOpen={showBankModal}
        onClose={() => setShowBankModal(false)}
        onSelect={(bankId) => setViewMode(bankId)}
        selectedId={viewMode !== 'budget' ? viewMode : undefined}
      />

      <SalarySettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentSalary={budgetData?.salary || 30000000}
        onSave={handleSaveSalary}
      />
    </>
  )
}

// Budget View Component
function BudgetView({ data, error }: { data: SalaryDashboardData | null; error: string | null }) {
  if (error) {
    return (
      <div className="text-center py-12 bg-gray-800/50 border border-red-700/50 rounded-xl">
        <p className="text-red-400">{error}</p>
        <p className="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 bg-gray-800/50 border border-gray-700/50 rounded-xl">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const remainingPercentage = Math.max(0, Math.round((data.remainingBalance / data.salary) * 100))
  const isOverBudget = data.remainingBalance < 0

  return (
    <div className="space-y-6">
      {/* Row 1: Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <TrendingUp className="w-4 h-4" />
            Monthly Salary
          </div>
          <p className="text-2xl md:text-3xl font-bold text-blue-400">
            {formatCurrency(data.salary)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Day {data.projections.daysElapsed} of {data.projections.daysElapsed + data.projections.daysRemaining}
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Wallet className="w-4 h-4" />
            Remaining Balance
          </div>
          <p className={`text-2xl md:text-3xl font-bold ${isOverBudget ? 'text-red-400' : 'text-green-400'}`}>
            {formatCurrency(Math.abs(data.remainingBalance))}
            {isOverBudget && <span className="text-lg ml-1">over</span>}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {isOverBudget ? 'Over budget' : `${remainingPercentage}% of salary left`}
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <TrendingDown className="w-4 h-4" />
            Total Spending
          </div>
          <p className="text-2xl md:text-3xl font-bold text-white">
            {formatCurrency(data.totalSpending)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            CC + Debit this month
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <Wallet className="w-4 h-4" />
            Daily Budget
          </div>
          <p className={`text-2xl md:text-3xl font-bold ${data.projections.dailyBudgetRemaining < 0 ? 'text-red-400' : 'text-amber-400'}`}>
            {formatCurrency(Math.abs(data.projections.dailyBudgetRemaining))}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Per day for {data.projections.daysRemaining} remaining days
          </p>
        </div>
      </div>

      {/* Row 2: CC Payment Due + Debit Spending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CC Payment Due */}
        <div className="bg-gray-800/50 border border-purple-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <CreditCard className="w-4 h-4 text-purple-400" />
              CC Payment Due
            </div>
            <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded">
              Statement Period
            </span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-purple-400 mb-3">
            {formatCurrency(data.ccPaymentDue)}
          </p>
          {data.ccPaymentDetails.length > 0 ? (
            <div className="space-y-2 pt-3 border-t border-gray-700">
              {data.ccPaymentDetails.map((cc) => (
                <div key={cc.bankId} className="flex justify-between text-sm">
                  <div>
                    <span className="text-gray-300">{cc.bankName}</span>
                    <span className="text-gray-500 text-xs ml-2">({cc.statementPeriod})</span>
                  </div>
                  <span className="text-gray-300">{formatCurrency(cc.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No credit card spending</p>
          )}

          {/* Payments Made */}
          {data.ccPaymentsMade && data.ccPaymentsMade.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Payments Made</p>
              <div className="space-y-1.5">
                {data.ccPaymentsMade.map((payment, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400">{payment.bankName}</span>
                        <span className="text-gray-500 text-xs">
                          {new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {payment.forCc && (
                        <span className="text-gray-500 text-xs">→ {payment.forCc}</span>
                      )}
                    </div>
                    <span className="text-green-400">-{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Debit Spending */}
        <div className="bg-gray-800/50 border border-green-700/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Banknote className="w-4 h-4 text-green-400" />
              Debit Spending
            </div>
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
              {data.period.label}
            </span>
          </div>
          <p className="text-2xl md:text-3xl font-bold text-green-400 mb-3">
            {formatCurrency(data.debitSpending)}
          </p>
          <p className="text-sm text-gray-500">
            Direct cash outflow this month
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Spending by Category</h3>
          {data.categoryBreakdown.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No spending data</p>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      nameKey="name"
                    >
                      {data.categoryBreakdown.map((entry, index) => (
                        <Cell key={entry.name} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {data.categoryBreakdown.map((item, index) => (
                  <div key={item.name} className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color || COLORS[index % COLORS.length] }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">{item.percentage}%</span>
                      <span className="text-gray-300 min-w-[100px] text-right">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Daily Trend */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Daily Spending Trend</h3>
          {data.dailySpending.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No spending data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailySpending}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#6B7280"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => new Date(value).getDate().toString()}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#6B7280"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Cumulative']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                  <ReferenceLine
                    y={data.salary}
                    stroke="#EF4444"
                    strokeDasharray="5 5"
                    label={{ value: 'Salary', position: 'right', fill: '#EF4444', fontSize: 10 }}
                  />
                  <Line type="monotone" dataKey="cumulativeAmount" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projections */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Projections</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">Average Daily Spending</span>
              <span className="font-medium">{formatCurrency(data.projections.averageDailySpending)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Projected Month-End Spending</span>
              <span className="font-medium">{formatCurrency(data.projections.projectedMonthEndSpending)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Projected Remaining</span>
              <span className={`font-medium ${data.projections.projectedRemainingBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {data.projections.projectedRemainingBalance < 0 ? '-' : ''}
                {formatCurrency(Math.abs(data.projections.projectedRemainingBalance))}
              </span>
            </div>
            <div className="pt-3 border-t border-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-400">Days Elapsed</span>
                <span>{data.projections.daysElapsed}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-400">Days Remaining</span>
                <span>{data.projections.daysRemaining}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Summary */}
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-400 mb-4">Spending by Bank</h3>
          {data.bankSummary.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No spending recorded</p>
              <Link href="/banks" className="text-blue-400 hover:underline text-sm mt-2 block">
                Sync your banks
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.bankSummary.map((bank) => {
                const percentage = data.totalSpending > 0
                  ? Math.round((bank.totalSpending / data.totalSpending) * 100)
                  : 0
                const isCredit = bank.bankType === 'credit'
                return (
                  <div key={bank.bankId}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span>{bank.bankName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          isCredit
                            ? 'bg-purple-400/10 text-purple-400'
                            : 'bg-green-400/10 text-green-400'
                        }`}>
                          {isCredit ? 'CC' : 'Debit'}
                        </span>
                      </div>
                      <span className="text-gray-400">{percentage}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isCredit ? 'bg-purple-500' : 'bg-green-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium min-w-[100px] text-right">
                        {formatCurrency(bank.totalSpending)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Active Installments */}
      {data.activeInstallments && data.activeInstallments.length > 0 && (
        <div className="bg-gray-800/50 border border-amber-700/50 rounded-xl p-5">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
            <Calendar className="w-4 h-4 text-amber-400" />
            Active Installments
          </div>
          <div className="space-y-3">
            {data.activeInstallments.map((inst) => (
              <div key={inst.transactionId} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-200 truncate max-w-[200px]">
                    {inst.merchant}
                  </p>
                  <p className="text-xs text-amber-400">
                    {inst.currentInstallment} of {inst.terms} payments
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-amber-400">
                    {formatCurrency(inst.monthlyAmount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    / {formatCurrency(inst.totalAmount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const INSTALLMENT_OPTIONS = [1, 3, 6, 12, 24]

// Bank Breakdown View Component
function BankBreakdownView({
  transactions,
  chartData,
  total,
  bankName,
  bankType,
  categories,
  activeInstallments,
  onCategoryChange,
  onInstallmentChange,
}: {
  transactions: Transaction[]
  chartData: ChartData[]
  total: number
  bankName: string
  bankType: string
  categories: string[]
  activeInstallments: InstallmentInfo[]
  onCategoryChange: (transactionIds: string[], newCategory: string) => Promise<void>
  onInstallmentChange: (transactionId: string, terms: number | null) => Promise<void>
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [sortByCategory, setSortByCategory] = useState(false)
  const isCreditCard = bankType === 'credit'

  // Sort transactions: by category (alpha) then by date (desc)
  const sortedTransactions = sortByCategory
    ? [...transactions].sort((a, b) => {
        const catCompare = a.category.localeCompare(b.category)
        if (catCompare !== 0) return catCompare
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
    : transactions
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inlineDropdownRef = useRef<HTMLDivElement>(null)
  const installmentDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryPicker(false)
      }
      if (inlineDropdownRef.current && !inlineDropdownRef.current.contains(event.target as Node)) {
        setEditingId(null)
      }
      if (installmentDropdownRef.current && !installmentDropdownRef.current.contains(event.target as Node)) {
        setEditingInstallmentId(null)
      }
    }
    if (showCategoryPicker || editingId || editingInstallmentId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCategoryPicker, editingId, editingInstallmentId])

  async function handleInstallmentChange(transactionId: string, terms: number) {
    setUpdating(true)
    try {
      await onInstallmentChange(transactionId, terms === 1 ? null : terms)
    } finally {
      setUpdating(false)
      setEditingInstallmentId(null)
    }
  }

  // Clear selection when transactions change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [transactions])

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(transactions.map(tx => tx.id)))
    }
  }

  async function handleBulkCategoryChange(category: string) {
    if (selectedIds.size === 0) return
    setUpdating(true)
    try {
      await onCategoryChange(Array.from(selectedIds), category)
      setSelectedIds(new Set())
    } finally {
      setUpdating(false)
      setShowCategoryPicker(false)
    }
  }

  async function handleSingleCategoryChange(transactionId: string, category: string) {
    setUpdating(true)
    try {
      await onCategoryChange([transactionId], category)
    } finally {
      setUpdating(false)
      setEditingId(null)
    }
  }
  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
      {/* Chart Section */}
      <div className="lg:w-80 lg:flex-shrink-0">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 md:p-5">
          <h2 className="text-xs md:text-sm font-medium text-gray-400 mb-1">{bankName} Spending</h2>
          <p className="text-2xl md:text-3xl font-bold text-green-400 mb-3 md:mb-4">
            {formatCurrency(total)}
          </p>

          {chartData.length === 0 ? (
            <p className="text-gray-500 text-sm">No IDR transactions</p>
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-2">
                {chartData.map((item, index) => (
                  <div key={item.name} className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-gray-400">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Active Installments for this bank */}
        {isCreditCard && activeInstallments.length > 0 && (
          <div className="bg-gray-800/50 border border-amber-700/50 rounded-xl p-4 md:p-5 mt-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
              <Calendar className="w-4 h-4 text-amber-400" />
              Active Installments
            </div>
            <div className="space-y-3">
              {activeInstallments.map((inst) => (
                <div key={inst.transactionId} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {inst.merchant}
                    </p>
                    <p className="text-xs text-amber-400">
                      {inst.currentInstallment} of {inst.terms} payments
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-sm font-medium text-amber-400">
                      {formatCurrency(inst.monthlyAmount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      / {formatCurrency(inst.totalAmount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="lg:flex-1 min-w-0">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 md:p-5 overflow-visible">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-xs md:text-sm font-medium text-gray-400">
              Transactions ({transactions.length})
            </h2>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No transactions in this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-visible -mx-4 px-4 md:mx-0 md:px-0">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                    <th className="pb-2 md:pb-3 pr-2 font-medium w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === transactions.length && transactions.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800"
                      />
                    </th>
                    <th className="pb-2 md:pb-3 pr-2 font-medium">Date</th>
                    <th className="pb-2 md:pb-3 pr-2 font-medium hidden md:table-cell">Type</th>
                    <th className="pb-2 md:pb-3 pr-2 font-medium">Merchant</th>
                    <th className="pb-2 md:pb-3 pr-2 font-medium hidden sm:table-cell">
                      <button
                        onClick={() => setSortByCategory(!sortByCategory)}
                        className={`flex items-center gap-1 hover:text-gray-300 transition-colors ${sortByCategory ? 'text-green-400' : ''}`}
                      >
                        Category
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    {isCreditCard && (
                      <th className="pb-2 md:pb-3 pr-2 font-medium hidden md:table-cell">Terms</th>
                    )}
                    <th className="pb-2 md:pb-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {sortedTransactions.map(tx => (
                    <tr
                      key={tx.id}
                      className={`hover:bg-gray-700/30 transition-colors ${selectedIds.has(tx.id) ? 'bg-green-900/20' : ''}`}
                    >
                      <td className="py-2 md:py-3 pr-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(tx.id)}
                          onChange={() => toggleSelect(tx.id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-green-500 focus:ring-green-500 focus:ring-offset-gray-800"
                        />
                      </td>
                      <td className="py-2 md:py-3 pr-2 text-gray-400 whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-2 md:py-3 pr-2 text-gray-300 hidden md:table-cell">{tx.transactionType}</td>
                      <td className="py-2 md:py-3 pr-2 font-medium max-w-[120px] md:max-w-none truncate">
                        {tx.merchant}
                      </td>
                      <td className="py-2 md:py-3 pr-2 hidden sm:table-cell relative">
                        {editingId === tx.id ? (
                          <div ref={inlineDropdownRef} className="absolute z-10 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-[140px]">
                            {categories.map(cat => (
                              <button
                                key={cat}
                                onClick={() => handleSingleCategoryChange(tx.id, cat)}
                                disabled={updating}
                                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 flex items-center justify-between
                                  ${cat === tx.category ? 'text-green-400' : 'text-gray-300'}`}
                              >
                                {cat}
                                {cat === tx.category && <Check className="w-3 h-3" />}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingId(tx.id)}
                            className="bg-gray-700/50 px-1.5 md:px-2 py-0.5 md:py-1 rounded-md text-xs
                                       hover:bg-gray-600/50 transition-colors flex items-center gap-1"
                          >
                            {tx.category}
                            <ChevronDown className="w-3 h-3 text-gray-500" />
                          </button>
                        )}
                      </td>
                      {isCreditCard && (
                        <td className="py-2 md:py-3 pr-2 hidden md:table-cell relative">
                          {editingInstallmentId === tx.id ? (
                            <div ref={installmentDropdownRef} className="absolute z-10 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg min-w-[80px]">
                              {INSTALLMENT_OPTIONS.map(term => (
                                <button
                                  key={term}
                                  onClick={() => handleInstallmentChange(tx.id, term)}
                                  disabled={updating}
                                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 flex items-center justify-between
                                    ${(tx.installmentTerms || 1) === term ? 'text-amber-400' : 'text-gray-300'}`}
                                >
                                  {term}x
                                  {(tx.installmentTerms || 1) === term && <Check className="w-3 h-3" />}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingInstallmentId(tx.id)}
                              className={`px-2 py-0.5 rounded-md text-xs transition-colors flex items-center gap-1
                                ${tx.installmentTerms && tx.installmentTerms > 1
                                  ? 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30'
                                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                                }`}
                            >
                              {tx.installmentTerms || 1}x
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      )}
                      <td className="py-2 md:py-3 text-right whitespace-nowrap">
                        <span className="font-medium">
                          {formatCurrency(tx.amount, tx.currency)}
                        </span>
                        {tx.currency !== 'IDR' && tx.idrAmount && (
                          <span className="text-gray-500 text-xs block">
                            ≈ {formatCurrency(tx.idrAmount)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 shadow-xl">
            <span className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-cyan-400 hover:text-cyan-300 px-2 py-1"
            >
              Clear
            </button>
            <div className="relative">
              <button
                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                disabled={updating}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {updating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Change Category
              </button>
              {showCategoryPicker && (
                <div
                  ref={dropdownRef}
                  className="absolute bottom-full mb-2 left-0 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto min-w-[180px]"
                >
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => handleBulkCategoryChange(cat)}
                      disabled={updating}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-gray-300"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
