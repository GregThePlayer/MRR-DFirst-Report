"use client"

import { useCurrency, type CurrencyCode } from "@/lib/currency-context"
import { cn } from "@/lib/utils"

const CURRENCIES: { code: CurrencyCode; symbol: string }[] = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "PLN", symbol: "zł" },
]

export function CurrencySwitcher({ className }: { className?: string }) {
  const { currency, setCurrency } = useCurrency()

  return (
    <div className={cn("flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5", className)}>
      {CURRENCIES.map(c => (
        <button
          key={c.code}
          onClick={() => setCurrency(c.code)}
          className={cn(
            "px-2 py-1 text-[10px] font-semibold rounded transition-colors",
            currency === c.code
              ? "bg-black text-white"
              : "text-gray-500 hover:text-black"
          )}
        >
          {c.code}
        </button>
      ))}
    </div>
  )
}
