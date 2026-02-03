'use client'

import { X, Building2, Check } from 'lucide-react'
import { useBankContext } from '@/contexts/BankContext'
import { useState } from 'react'

interface BankSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect?: (bankId: string) => void
  selectedId?: string
}

export function BankSelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedId,
}: BankSelectionModalProps) {
  const { banks, selectedBankId, setSelectedBankId } = useBankContext()
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) return null

  const currentSelectedId = selectedId ?? selectedBankId

  const handleSelectBank = (bankId: string) => {
    if (onSelect) {
      onSelect(bankId)
    } else {
      setSelectedBankId(bankId)
    }
    onClose()
    setSearchQuery('')
  }

  const filteredBanks = banks.filter(bank =>
    bank.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
              <Building2 className="w-5 h-5 text-green-500" />
            </div>
            Select Bank
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        {banks.length > 5 && (
          <div className="p-4 border-b border-gray-700">
            <input
              type="text"
              placeholder="Search banks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                         placeholder:text-gray-500"
            />
          </div>
        )}

        {/* Bank List */}
        <div className="p-3 max-h-96 overflow-y-auto">
          {filteredBanks.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No banks found</p>
          ) : (
            <div className="space-y-2">
              {filteredBanks.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => handleSelectBank(bank.id)}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl text-left
                    transition-all duration-200
                    ${currentSelectedId === bank.id
                      ? 'bg-green-600/20 border-2 border-green-500/50 shadow-lg shadow-green-500/10'
                      : 'bg-gray-900/50 border-2 border-transparent hover:bg-gray-700/50 hover:border-gray-600'
                    }
                  `}
                >
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0 ring-2 ring-white/20"
                    style={{ backgroundColor: bank.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{bank.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Statement day: {bank.statementDay}
                    </p>
                  </div>
                  {currentSelectedId === bank.id && (
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
