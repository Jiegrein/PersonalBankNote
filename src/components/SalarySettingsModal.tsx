'use client'

import { useState, useEffect } from 'react'
import { X, Settings, DollarSign } from 'lucide-react'

interface SalarySettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentSalary: number
  onSave: (newSalary: number) => void
}

export function SalarySettingsModal({
  isOpen,
  onClose,
  currentSalary,
  onSave,
}: SalarySettingsModalProps) {
  const [salaryInput, setSalaryInput] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSalaryInput(formatNumberInput(currentSalary))
      setError('')
    }
  }, [isOpen, currentSalary])

  if (!isOpen) return null

  function formatNumberInput(value: number): string {
    return value.toLocaleString('id-ID')
  }

  function parseNumberInput(value: string): number {
    return parseInt(value.replace(/\D/g, ''), 10) || 0
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawValue = e.target.value.replace(/\D/g, '')
    const numericValue = parseInt(rawValue, 10) || 0
    setSalaryInput(formatNumberInput(numericValue))
    setError('')
  }

  async function handleSave() {
    const numericValue = parseNumberInput(salaryInput)

    if (numericValue <= 0) {
      setError('Salary must be a positive number')
      return
    }

    setSaving(true)
    try {
      await onSave(numericValue)
      onClose()
    } catch {
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-500" />
            </div>
            Salary Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Monthly Salary
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-400">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Rp</span>
              </div>
              <input
                type="text"
                value={salaryInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-16 pr-4 py-3 text-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           placeholder:text-gray-500"
                placeholder="30,000,000"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          <p className="text-xs text-gray-500">
            This is your monthly salary amount used to calculate remaining budget and projections.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white
                       hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500
                       rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
