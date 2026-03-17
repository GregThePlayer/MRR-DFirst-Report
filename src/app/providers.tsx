"use client"

import { CurrencyProvider } from "@/lib/currency-context"
import { ImportProvider } from "@/lib/import-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <ImportProvider>
        {children}
      </ImportProvider>
    </CurrencyProvider>
  )
}
