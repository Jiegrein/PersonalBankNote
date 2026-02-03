'use client'

import { SessionProvider } from 'next-auth/react'
import { BankProvider } from '@/contexts/BankContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <BankProvider>
        {children}
      </BankProvider>
    </SessionProvider>
  )
}
