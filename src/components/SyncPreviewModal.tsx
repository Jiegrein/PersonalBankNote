'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { X, RefreshCw, Check, Square, CheckSquare } from 'lucide-react'
import { PreviewTransaction } from '@/types'

interface SyncPreviewModalProps {
  isOpen: boolean
  bankId: string
  bankName: string
  onClose: () => void
  onImportComplete: (count: number) => void
}

export default function SyncPreviewModal({
  isOpen,
  bankId,
  bankName,
  onClose,
  onImportComplete,
}: SyncPreviewModalProps) {
  const [transactions, setTransactions] = useState<PreviewTransaction[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({ totalFound: 0, alreadySynced: 0 })

  useEffect(() => {
    if (isOpen) {
      fetchPreview()
    }
  }, [isOpen, bankId])

  async function fetchPreview() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankId, preview: true }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Force logout on expired token
        if (data.code === 'TOKEN_EXPIRED' || res.status === 401) {
          signOut({ callbackUrl: '/' })
          return
        }
        throw new Error(data.error || 'Failed to fetch preview')
      }

      setTransactions(data.previewTransactions)
      setSelectedIds(new Set(data.previewTransactions.map((t: PreviewTransaction) => t.tempId)))
      setStats({
        totalFound: data.totalFound,
        alreadySynced: data.alreadySynced,
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleImport() {
    const selected = transactions.filter(t => selectedIds.has(t.tempId))
    if (selected.length === 0) return

    setImporting(true)
    setError(null)

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankId, commit: true, transactions: selected }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'TOKEN_EXPIRED' || res.status === 401) {
          signOut({ callbackUrl: '/' })
          return
        }
        throw new Error(data.error || 'Failed to import')
      }

      onImportComplete(data.imported)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  function toggleSelect(tempId: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(tempId)) {
        next.delete(tempId)
      } else {
        next.add(tempId)
      }
      return next
    })
  }

  function selectAll() {
    setSelectedIds(new Set(transactions.map(t => t.tempId)))
  }

  function deselectAll() {
    setSelectedIds(new Set())
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatAmount(amount: number, currency: string) {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ' + currency
  }

  function truncate(str: string, len: number) {
    return str.length > len ? str.slice(0, len) + '...' : str
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-[70vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Sync Preview - {bankName}</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-3 bg-gray-800/80 border-b border-gray-700 flex items-center gap-4 text-sm">
          <span className="text-gray-400">
            Emails found: <span className="text-white">{stats.totalFound}</span>
          </span>
          <span className="text-gray-400">
            Already synced: <span className="text-white">{stats.alreadySynced}</span>
          </span>
          <span className="text-gray-400">
            New: <span className="text-green-400">{transactions.length}</span>
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
              <span className="ml-2 text-gray-400">Fetching emails...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchPreview}
                className="text-blue-400 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No new transactions found.</p>
            </div>
          ) : (
            <>
              {/* Selection Controls */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Select All
                </button>
                <span className="text-gray-600">|</span>
                <button
                  onClick={deselectAll}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Deselect All
                </button>
                <span className="ml-auto text-sm text-gray-400">
                  {selectedIds.size} of {transactions.length} selected
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-700">
                      <th className="pb-2 pr-2 w-10"></th>
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">Merchant</th>
                      <th className="pb-2 pr-4 text-right">Amount</th>
                      <th className="pb-2">Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr
                        key={t.tempId}
                        onClick={() => toggleSelect(t.tempId)}
                        className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                      >
                        <td className="py-2 pr-2">
                          {selectedIds.has(t.tempId) ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-500" />
                          )}
                        </td>
                        <td className="py-2 pr-4 text-gray-300 whitespace-nowrap">
                          {formatDate(t.date)}
                        </td>
                        <td className="py-2 pr-4 text-gray-300" title={t.transactionType}>
                          {t.transactionType}
                        </td>
                        <td className="py-2 pr-4 font-medium" title={t.merchant}>
                          {t.merchant}
                        </td>
                        <td className="py-2 pr-4 text-right whitespace-nowrap">
                          {formatAmount(t.amount, t.currency)}
                        </td>
                        <td className="py-2">
                          <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                            {t.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={selectedIds.size === 0 || importing || loading}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700
                       px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
          >
            {importing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Import Selected ({selectedIds.size})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
