'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { getBillingPeriod, formatCurrency } from '@/lib/billing-cycle'
import { ChevronLeft, ChevronRight, Building2, RefreshCw } from 'lucide-react'

interface Bank {
  id: string
  name: string
  statementDay: number
  color: string
}

interface Transaction {
  id: string
  amount: number
  currency: string
  idrAmount: number | null
  merchant: string
  category: string
  date: string
  bank: { name: string; color: string }
}

interface ChartData {
  name: string
  value: number
  percentage: number
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280']

export default function DashboardPage() {
  const { data: session } = useSession()
  const [banks, setBanks] = useState<Bank[]>([])
  const [selectedBankId, setSelectedBankId] = useState<string>('')
  const [monthOffset, setMonthOffset] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Fetch banks on mount
  useEffect(() => {
    async function fetchBanks() {
      try {
        const res = await fetch('/api/banks')
        const data = await res.json()
        if (res.ok && Array.isArray(data)) {
          setBanks(data)
          if (data.length > 0) {
            setSelectedBankId(data[0].id)
          }
        } else {
          console.error('Failed to fetch banks:', data)
          setBanks([])
        }
      } catch (error) {
        console.error('Failed to fetch banks:', error)
        setBanks([])
      }
    }
    fetchBanks()
  }, [])

  // Fetch transactions when bank or period changes
  useEffect(() => {
    if (!selectedBankId) {
      setLoading(false)
      return
    }

    const selectedBank = banks.find(b => b.id === selectedBankId)
    if (!selectedBank) return

    const period = getBillingPeriod(selectedBank.statementDay, monthOffset)

    async function fetchTransactions() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          bankId: selectedBankId,
          startDate: period.startDate.toISOString(),
          endDate: period.endDate.toISOString(),
        })

        const res = await fetch(`/api/transactions?${params}`)
        const data = await res.json()

        if (res.ok && data) {
          setTransactions(Array.isArray(data.transactions) ? data.transactions : [])
          setChartData(Array.isArray(data.chartData) ? data.chartData : [])
          setTotal(data.total || 0)
        } else {
          console.error('Failed to fetch transactions:', data)
          setTransactions([])
          setChartData([])
          setTotal(0)
        }
      } catch (error) {
        console.error('Failed to fetch transactions:', error)
        setTransactions([])
        setChartData([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [selectedBankId, monthOffset, banks])

  const selectedBank = banks.find(b => b.id === selectedBankId)
  const period = selectedBank
    ? getBillingPeriod(selectedBank.statementDay, monthOffset)
    : null

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Please sign in to view dashboard.</p>
          <Link href="/" className="text-blue-400 hover:underline">Go to home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {/* Bank Selector */}
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-gray-500" />
          <select
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500/50"
          >
            {banks.map(bank => (
              <option key={bank.id} value={bank.id}>{bank.name}</option>
            ))}
          </select>
        </div>

        {/* Period Navigator */}
        <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setMonthOffset(monthOffset - 1)}
            className="p-2 hover:bg-gray-700 rounded-md transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 min-w-[140px] text-center text-sm font-medium">
            {period?.label || 'Select bank'}
          </span>
          <button
            onClick={() => setMonthOffset(monthOffset + 1)}
            disabled={monthOffset >= 0}
            className="p-2 hover:bg-gray-700 rounded-md transition-colors disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {banks.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 border border-gray-700/50 rounded-xl">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No banks configured yet</p>
          <Link
            href="/banks"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm"
          >
            Add your first bank
          </Link>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      ) : (
        /* Main Layout - Side by side on desktop */
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chart Section (30%) */}
          <div className="lg:w-[30%]">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
              <h2 className="text-sm font-medium text-gray-400 mb-1">Total Spending</h2>
              <p className="text-3xl font-bold text-green-400 mb-4">
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
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend */}
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
          </div>

          {/* Table Section (70%) */}
          <div className="lg:w-[70%]">
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-400">
                  Transactions ({transactions.length})
                </h2>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No transactions in this period</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs uppercase tracking-wider">
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Merchant</th>
                        <th className="pb-3 font-medium">Category</th>
                        <th className="pb-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-gray-700/30 transition-colors">
                          <td className="py-3 text-gray-400">
                            {new Date(tx.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="py-3 font-medium">{tx.merchant}</td>
                          <td className="py-3">
                            <span className="bg-gray-700/50 px-2 py-1 rounded-md text-xs">
                              {tx.category}
                            </span>
                          </td>
                          <td className="py-3 text-right">
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
        </div>
      )}
    </div>
  )
}
