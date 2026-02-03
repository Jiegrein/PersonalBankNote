'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Bank {
  id: string
  name: string
  statementDay: number
  color: string
  bankType: string
}

interface BankContextType {
  banks: Bank[]
  selectedBankId: string
  setSelectedBankId: (id: string) => void
  loading: boolean
}

const BankContext = createContext<BankContextType | undefined>(undefined)

export function BankProvider({ children }: { children: ReactNode }) {
  const [banks, setBanks] = useState<Bank[]>([])
  const [selectedBankId, setSelectedBankId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBanks() {
      try {
        const res = await fetch('/api/banks')
        const data = await res.json()
        if (res.ok && Array.isArray(data)) {
          setBanks(data)
          // Use functional update to avoid dependency on selectedBankId
          setSelectedBankId(prev => prev || (data.length > 0 ? data[0].id : ''))
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
    fetchBanks()
  }, []) // Only fetch on mount

  return (
    <BankContext.Provider value={{ banks, selectedBankId, setSelectedBankId, loading }}>
      {children}
    </BankContext.Provider>
  )
}

export function useBankContext() {
  const context = useContext(BankContext)
  if (context === undefined) {
    throw new Error('useBankContext must be used within a BankProvider')
  }
  return context
}
