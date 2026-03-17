"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Database, RefreshCw, Clock, CheckCircle, AlertCircle, FileSpreadsheet, CreditCard, FileText, Trash2, Loader2, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

interface ImportBatch {
  source: string
  count: number
  firstDate: string
  lastDate: string
}

const DATA_SOURCES = [
  {
    name: "Stripe (Google Sheets)",
    type: "stripe",
    icon: CreditCard,
    description: "DF.AI - Data - 2025/2026 → Stripe tab",
    lastSync: null,
    status: "not_connected",
    records: 0,
  },
  {
    name: "Invoices 2025 (Taxxo)",
    type: "invoice_xlsx",
    icon: FileText,
    description: "DF.AI Sprzedaż za 2025 rok Subskrypcje i kursy.xlsx",
    lastSync: null,
    status: "not_connected",
    records: 0,
  },
  {
    name: "Invoices Jan 2026",
    type: "invoice_xlsx",
    icon: FileText,
    description: "Zest_Sprzedaż za 01-26 w DF.AI z Taxxo.xlsx",
    lastSync: null,
    status: "not_connected",
    records: 0,
  },
  {
    name: "GA4 / Mixpanel",
    type: "manual",
    icon: Database,
    description: "Manual marketing metrics (users, signups, ad spend)",
    lastSync: "2026-03-16",
    status: "active",
    records: 7,
  },
]

export default function DataPage() {
  const [batches, setBatches] = useState<ImportBatch[]>([])
  const [loadingBatches, setLoadingBatches] = useState(true)
  const [deletingSource, setDeletingSource] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)

  const fetchBatches = async () => {
    if (!supabase) {
      setLoadingBatches(false)
      return
    }
    const db = supabase as AnySupabase
    try {
      const { data, error } = await db
        .from('transactions')
        .select('source, transaction_date')
        .order('transaction_date', { ascending: true })

      if (error) throw error

      // Aggregate by source
      const map = new Map<string, { count: number; firstDate: string; lastDate: string }>()
      for (const row of (data || [])) {
        const s = row.source || 'unknown'
        if (!map.has(s)) {
          map.set(s, { count: 0, firstDate: row.transaction_date, lastDate: row.transaction_date })
        }
        const entry = map.get(s)!
        entry.count++
        if (row.transaction_date < entry.firstDate) entry.firstDate = row.transaction_date
        if (row.transaction_date > entry.lastDate) entry.lastDate = row.transaction_date
      }

      const result: ImportBatch[] = []
      for (const [source, info] of map) {
        result.push({ source, ...info })
      }
      result.sort((a, b) => b.count - a.count)
      setBatches(result)
    } catch (err) {
      console.error('Failed to fetch batches:', err)
    } finally {
      setLoadingBatches(false)
    }
  }

  useEffect(() => { fetchBatches() }, [])

  const handleDeleteSource = async (source: string, count: number) => {
    if (!supabase) return
    if (!confirm(`Delete all ${count} transactions from "${source}"?\n\nThis cannot be undone.`)) return
    const db = supabase as AnySupabase
    setDeletingSource(source)
    try {
      // Delete transactions by source
      const { error } = await db.from('transactions').delete().eq('source', source)
      if (error) throw error

      // Clean up orphaned customers from this source
      // (only those with no remaining transactions)
      const { data: orphans } = await db
        .from('customers')
        .select('id')
        .eq('source', source)

      if (orphans && orphans.length > 0) {
        for (const c of orphans) {
          const { data: remaining } = await db
            .from('transactions')
            .select('id')
            .eq('customer_id', c.id)
            .limit(1)
          if (!remaining || remaining.length === 0) {
            await db.from('customers').delete().eq('id', c.id)
          }
        }
      }

      toast.success(`Deleted ${count} transactions from "${source}"`)
      fetchBatches()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingSource(null)
    }
  }

  const handleDeleteAll = async () => {
    if (!supabase) return
    const totalCount = batches.reduce((s, b) => s + b.count, 0)
    if (!confirm(`DELETE ALL ${totalCount} transactions and all customers?\n\nThis will reset your entire database. This cannot be undone.`)) return
    if (!confirm(`Are you REALLY sure? This deletes EVERYTHING.`)) return
    const db = supabase as AnySupabase
    setDeletingAll(true)
    try {
      await db.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await db.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      toast.success('All data deleted')
      fetchBatches()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingAll(false)
    }
  }

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    syncing: "bg-blue-100 text-blue-700",
    error: "bg-red-100 text-red-700",
    not_connected: "bg-gray-100 text-gray-600",
  }

  const totalTransactions = batches.reduce((s, b) => s + b.count, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black tracking-tight">Data Sources</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage imports, sync schedules, and data overrides</p>
        </div>
        <Button className="bg-black text-white hover:bg-gray-800" onClick={fetchBatches}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Import History — Bulk Delete */}
      <Card className="bg-white border border-gray-100 shadow-none overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-black">Imported Data</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalTransactions} total transactions from {batches.length} source{batches.length !== 1 ? 's' : ''}
            </p>
          </div>
          {batches.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleDeleteAll}
              disabled={deletingAll}
            >
              {deletingAll ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
              Delete All Data
            </Button>
          )}
        </div>

        {loadingBatches ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-gray-300 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-gray-400">Loading import history...</p>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No imported data yet</p>
            <p className="text-xs text-gray-300 mt-1">Go to Import to upload your first CSV/XLSX</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {batches.map(batch => (
              <div key={batch.source} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{batch.source}</span>
                      <Badge variant="outline" className="text-[10px]">{batch.count} transactions</Badge>
                    </div>
                    <p className="text-xs text-gray-400">
                      {batch.firstDate} → {batch.lastDate}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleDeleteSource(batch.source, batch.count)}
                  disabled={deletingSource === batch.source}
                >
                  {deletingSource === batch.source ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                  )}
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DATA_SOURCES.map(ds => (
          <Card key={ds.name} className="p-5 bg-white border border-gray-100 shadow-none hover:border-gray-200 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                <ds.icon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{ds.name}</h3>
                  <Badge className={`${statusColors[ds.status]} text-[10px]`}>
                    {ds.status === 'active' ? <CheckCircle className="w-3 h-3 mr-0.5" /> : <AlertCircle className="w-3 h-3 mr-0.5" />}
                    {ds.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 truncate">{ds.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ds.lastSync ? `Last sync: ${ds.lastSync}` : 'Never synced'}
                  </span>
                  <span>{ds.records} records</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0">
                {ds.status === 'not_connected' ? 'Connect' : 'Sync'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Override System Explanation */}
      <Card className="p-5 bg-[#D9FD13]/10 border-[#D9FD13]/30 shadow-none">
        <h3 className="font-semibold text-sm text-black mb-2">How Data Overrides Work</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <p>
            When you edit a transaction or customer record, the system saves your correction as an <strong>override</strong>.
            During the next sync, raw data is re-imported from the source, and then all overrides are applied on top.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center gap-1 px-2 py-1 bg-white rounded border">
              <FileSpreadsheet className="w-3 h-3" /> Raw Import
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-1 px-2 py-1 bg-white rounded border">
              <Database className="w-3 h-3" /> Apply Overrides
            </div>
            <span className="text-gray-400">→</span>
            <div className="flex items-center gap-1 px-2 py-1 bg-black text-white rounded">
              <CheckCircle className="w-3 h-3" /> Final Data
            </div>
          </div>
          <p className="mt-2">
            This means your corrections are <strong>never lost</strong> during re-sync. You can also see all active overrides
            and remove them to revert to the original source data.
          </p>
        </div>
      </Card>
    </div>
  )
}
