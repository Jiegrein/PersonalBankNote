'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Plus, RefreshCw, Pencil, Trash2, X } from 'lucide-react'
import SyncPreviewModal from '@/components/SyncPreviewModal'
import { PARSER_OPTIONS } from '@/lib/parsers'

interface Bank {
  id: string
  name: string
  emailFilter: string
  statementDay: number
  dueDay: number | null
  bankType: string
  color: string
  parserType: string
}

interface PreviewModalState {
  isOpen: boolean
  bankId: string
  bankName: string
}

export default function BanksPage() {
  const { data: session } = useSession()
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [previewModal, setPreviewModal] = useState<PreviewModalState | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    emailFilter: '',
    statementDay: 1,
    dueDay: null as number | null,
    bankType: 'debit',
    color: '#3B82F6',
    parserType: 'generic',
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  // Fetch banks
  useEffect(() => {
    fetchBanks()
  }, [])

  async function fetchBanks() {
    try {
      const res = await fetch('/api/banks')
      const data = await res.json()
      if (res.ok && Array.isArray(data)) {
        setBanks(data)
      } else {
        console.error('Failed to fetch banks:', data)
        setBanks([])
      }
    } catch (error) {
      console.error('Failed to fetch banks:', error)
      setBanks([])
    } finally {
      setLoading(false)
    }
  }

  // Create or update bank
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const url = editingId ? `/api/banks/${editingId}` : '/api/banks'
    const method = editingId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        fetchBanks()
        resetForm()
      }
    } catch (error) {
      console.error('Failed to save bank:', error)
    }
  }

  // Delete bank
  async function handleDelete(id: string) {
    if (!confirm('Delete this bank and all its transactions?')) return

    try {
      const res = await fetch(`/api/banks/${id}`, { method: 'DELETE' })
      if (res.ok) fetchBanks()
    } catch (error) {
      console.error('Failed to delete bank:', error)
    }
  }

  // Open sync preview modal
  function handleSync(bankId: string, bankName: string) {
    setPreviewModal({ isOpen: true, bankId, bankName })
  }

  // Handle import completion
  function handleImportComplete(count: number) {
    alert(`Successfully imported ${count} transaction${count !== 1 ? 's' : ''}.`)
  }

  // Close preview modal
  function closePreviewModal() {
    setPreviewModal(null)
  }

  // Edit bank
  function handleEdit(bank: Bank) {
    setFormData({
      name: bank.name,
      emailFilter: bank.emailFilter,
      statementDay: bank.statementDay,
      dueDay: bank.dueDay,
      bankType: bank.bankType || 'debit',
      color: bank.color,
      parserType: bank.parserType || 'generic',
    })
    setEditingId(bank.id)
    setShowForm(true)
  }

  // Reset form
  function resetForm() {
    setFormData({ name: '', emailFilter: '', statementDay: 1, dueDay: null, bankType: 'debit', color: '#3B82F6', parserType: 'generic' })
    setEditingId(null)
    setShowForm(false)
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Please sign in to manage banks.</p>
          <Link href="/" className="text-blue-400 hover:underline">Go to home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Banks</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${showForm
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add Bank'}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-800/50 border border-gray-700/50 p-6 rounded-xl mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-700 rounded px-3 py-2"
                placeholder="SMBC"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email Filter</label>
              <input
                type="email"
                value={formData.emailFilter}
                onChange={(e) => setFormData({ ...formData, emailFilter: e.target.value })}
                className="w-full bg-gray-700 rounded px-3 py-2"
                placeholder="alerts@bank.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bank Type</label>
              <select
                value={formData.bankType}
                onChange={(e) => setFormData({ ...formData, bankType: e.target.value, dueDay: e.target.value === 'credit' ? formData.dueDay : null })}
                className="w-full bg-gray-700 rounded px-3 py-2"
              >
                <option value="debit">Debit</option>
                <option value="credit">Credit Card</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Statement Day (1-31)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.statementDay}
                onChange={(e) => setFormData({ ...formData, statementDay: parseInt(e.target.value) })}
                className="w-full bg-gray-700 rounded px-3 py-2"
                required
              />
            </div>
            {formData.bankType === 'credit' && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Due Day (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dueDay || ''}
                  onChange={(e) => setFormData({ ...formData, dueDay: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full bg-gray-700 rounded px-3 py-2"
                  placeholder="e.g., 5"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-full h-10 bg-gray-700 rounded"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Parser Type</label>
              <select
                value={formData.parserType}
                onChange={(e) => setFormData({ ...formData, parserType: e.target.value })}
                className="w-full bg-gray-700 rounded px-3 py-2"
              >
                {PARSER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}

        {/* Banks List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : banks.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/50 border border-gray-700/50 rounded-xl">
            <p className="text-gray-400">No banks configured. Add one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {banks.map((bank) => (
              <div
                key={bank.id}
                className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl
                           flex items-center justify-between hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: bank.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{bank.name}</h3>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        bank.bankType === 'credit'
                          ? 'bg-purple-400/10 text-purple-400'
                          : 'bg-green-400/10 text-green-400'
                      }`}>
                        {bank.bankType === 'credit' ? 'Credit' : 'Debit'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {bank.emailFilter} • Statement {bank.statementDay}
                      {bank.bankType === 'credit' && bank.dueDay && ` • Due ${bank.dueDay}`}
                      {' • '}{PARSER_OPTIONS.find(p => p.value === bank.parserType)?.label || 'Generic'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSync(bank.id, bank.name)}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700
                               px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sync
                  </button>
                  <button
                    onClick={() => handleEdit(bank)}
                    className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(bank.id)}
                    className="p-1.5 hover:bg-red-600/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sync Preview Modal */}
      {previewModal && (
        <SyncPreviewModal
          isOpen={previewModal.isOpen}
          bankId={previewModal.bankId}
          bankName={previewModal.bankName}
          onClose={closePreviewModal}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  )
}
