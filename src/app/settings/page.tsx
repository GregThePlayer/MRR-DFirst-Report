"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Database, Globe, Key, RefreshCw, Check, AlertCircle } from "lucide-react"
import { useCurrency, type CurrencyCode } from "@/lib/currency-context"
import { useSupabaseStatus } from "@/lib/use-data"

const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "PLN", label: "Polish Zloty", symbol: "zł" },
]

export default function SettingsPage() {
  const { currency, setCurrency, rates, lastFetched, loading, error, refreshRates } = useCurrency()
  const dbStatus = useSupabaseStatus()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform configuration</p>
      </div>

      <Card className="p-6 bg-white border border-gray-100 shadow-none">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Supabase Connection</h3>
          <Badge className={
            dbStatus === 'connected' ? 'bg-emerald-100 text-emerald-700 text-[10px]' :
            dbStatus === 'no_tables' ? 'bg-amber-100 text-amber-700 text-[10px]' :
            'bg-gray-100 text-gray-600 text-[10px]'
          }>
            {dbStatus === 'connected' ? <><Check className="w-3 h-3 mr-0.5" /> Connected</> :
             dbStatus === 'no_tables' ? <><AlertCircle className="w-3 h-3 mr-0.5" /> No Tables</> :
             dbStatus === 'checking' ? 'Checking...' : 'Demo Mode'}
          </Badge>
        </div>
        <div className="space-y-3 max-w-md">
          <div>
            <Label className="text-xs">Supabase URL</Label>
            <Input placeholder="https://your-project.supabase.co" className="bg-gray-50" />
          </div>
          <div>
            <Label className="text-xs">Anon Key</Label>
            <Input type="password" placeholder="eyJhbGciOi..." className="bg-gray-50" />
          </div>
          <Button className="bg-black text-white hover:bg-gray-800">
            Test Connection
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-white border border-gray-100 shadow-none">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Currency Settings</h3>
          {rates && (
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
              <Check className="w-3 h-3 mr-0.5" />
              Rates loaded
            </Badge>
          )}
        </div>

        <div className="space-y-4 max-w-lg">
          <div>
            <Label className="text-xs mb-2 block">Display Currency</Label>
            <div className="flex gap-2">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 text-left transition-all ${
                    currency === c.code
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <span className="text-lg font-bold">{c.symbol}</span>
                  <span className="block text-xs mt-0.5 opacity-70">{c.code} — {c.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">All monetary values across the app will be converted and displayed in this currency</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs">Live Exchange Rates (base: USD)</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] gap-1"
                onClick={refreshRates}
                disabled={loading}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Fetching..." : "Refresh"}
              </Button>
            </div>

            {error && (
              <p className="text-xs text-amber-600 mb-2">Using fallback rates — {error}</p>
            )}

            {rates && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">1 USD</span>
                  <span className="text-sm font-mono font-semibold">{rates.EUR.toFixed(4)} EUR</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">1 USD</span>
                  <span className="text-sm font-mono font-semibold">{rates.PLN.toFixed(4)} PLN</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">1 EUR</span>
                  <span className="text-sm font-mono font-semibold">{(rates.PLN / rates.EUR).toFixed(4)} PLN</span>
                </div>
                {lastFetched && (
                  <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-200">
                    Source: ECB via Frankfurter API · Last fetched: {new Date(lastFetched).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-white border border-gray-100 shadow-none">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Google Sheets Integration</h3>
          <Badge className="bg-gray-100 text-gray-600 text-[10px]">Coming in v1.1</Badge>
        </div>
        <p className="text-xs text-gray-500">
          Direct connection to Google Sheets for automatic data sync. Currently data is imported via file upload.
        </p>
      </Card>
    </div>
  )
}
