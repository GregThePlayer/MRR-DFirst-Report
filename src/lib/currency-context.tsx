"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export type CurrencyCode = "USD" | "EUR" | "PLN"

interface ExchangeRates {
  USD: number
  EUR: number
  PLN: number
}

interface CurrencyContextType {
  currency: CurrencyCode
  setCurrency: (c: CurrencyCode) => void
  rates: ExchangeRates | null
  lastFetched: string | null
  loading: boolean
  error: string | null
  convert: (amountUsd: number) => number
  formatCurrency: (amountUsd: number, decimals?: number) => string
  refreshRates: () => Promise<void>
}

const CurrencyContext = createContext<CurrencyContextType | null>(null)

const CACHE_KEY = "dfirst_exchange_rates"
const CACHE_CURRENCY_KEY = "dfirst_display_currency"
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface CachedRates {
  rates: ExchangeRates
  fetchedAt: string
}

function getCachedRates(): CachedRates | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached: CachedRates = JSON.parse(raw)
    const age = Date.now() - new Date(cached.fetchedAt).getTime()
    if (age > CACHE_TTL) return null
    return cached
  } catch {
    return null
  }
}

function getCachedCurrency(): CurrencyCode {
  if (typeof window === "undefined") return "USD"
  return (localStorage.getItem(CACHE_CURRENCY_KEY) as CurrencyCode) || "USD"
}

const LOCALE_MAP: Record<CurrencyCode, string> = {
  USD: "en-US",
  EUR: "de-DE",
  PLN: "pl-PL",
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD")
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [lastFetched, setLastFetched] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c)
    if (typeof window !== "undefined") {
      localStorage.setItem(CACHE_CURRENCY_KEY, c)
    }
  }, [])

  const fetchRates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Frankfurter API — free, no key needed, ECB data
      const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,PLN")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const newRates: ExchangeRates = {
        USD: 1,
        EUR: data.rates.EUR,
        PLN: data.rates.PLN,
      }
      const fetchedAt = new Date().toISOString()
      setRates(newRates)
      setLastFetched(fetchedAt)
      if (typeof window !== "undefined") {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: newRates, fetchedAt }))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch rates"
      setError(msg)
      // Fallback rates if nothing cached
      if (!rates) {
        setRates({ USD: 1, EUR: 0.92, PLN: 4.02 })
        setLastFetched(null)
      }
    } finally {
      setLoading(false)
    }
  }, [rates])

  // Init: load cache, then fetch if stale
  useEffect(() => {
    setCurrencyState(getCachedCurrency())
    const cached = getCachedRates()
    if (cached) {
      setRates(cached.rates)
      setLastFetched(cached.fetchedAt)
    } else {
      fetchRates()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const convert = useCallback(
    (amountUsd: number): number => {
      if (!rates || currency === "USD") return amountUsd
      return amountUsd * rates[currency]
    },
    [rates, currency]
  )

  const formatCurrencyFn = useCallback(
    (amountUsd: number, decimals = 0): string => {
      const converted = convert(amountUsd)
      return new Intl.NumberFormat(LOCALE_MAP[currency], {
        style: "currency",
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(converted)
    },
    [convert, currency]
  )

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        rates,
        lastFetched,
        loading,
        error,
        convert,
        formatCurrency: formatCurrencyFn,
        refreshRates: fetchRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider")
  return ctx
}
