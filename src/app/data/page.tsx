"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Database, RefreshCw, Clock, CheckCircle, AlertCircle, FileSpreadsheet, CreditCard, FileText } from "lucide-react"

const DATA_SOURCES = [
  {
    name: "Stripe (Google Sheets)",
    type: "stripe",
    icon: CreditCard,
    description: "DF.AI - Data - 2025/2026 → Stripe tab",
    lastSync: null,
    status: "not_connected",
    records: 0,
    config: { sheetId: "...", gid: 0 },
  },
  {
    name: "Invoices 2025 (Taxxo)",
    type: "invoice_xlsx",
    icon: FileText,
    description: "DF.AI Sprzedaż za 2025 rok Subskrypcje i kursy.xlsx",
    lastSync: null,
    status: "not_connected",
    records: 0,
    config: { filePath: "~/Downloads/..." },
  },
  {
    name: "Invoices Jan 2026",
    type: "invoice_xlsx",
    icon: FileText,
    description: "Zest_Sprzedaż za 01-26 w DF.AI z Taxxo.xlsx",
    lastSync: null,
    status: "not_connected",
    records: 0,
    config: { filePath: "~/Documents/..." },
  },
  {
    name: "GA4 / Mixpanel",
    type: "manual",
    icon: Database,
    description: "Manual marketing metrics (users, signups, ad spend)",
    lastSync: "2026-03-16",
    status: "active",
    records: 7,
    config: {},
  },
]

export default function DataPage() {
  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    syncing: "bg-blue-100 text-blue-700",
    error: "bg-red-100 text-red-700",
    not_connected: "bg-gray-100 text-gray-600",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black tracking-tight">Data Sources</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage imports, sync schedules, and data overrides</p>
        </div>
        <Button className="bg-black text-white hover:bg-gray-800">
          <RefreshCw className="w-4 h-4 mr-1" /> Sync All
        </Button>
      </div>

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

      {/* Active Overrides */}
      <Card className="bg-white border border-gray-100 shadow-none overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-sm text-black">Active Overrides</h3>
          <p className="text-xs text-gray-400 mt-0.5">User corrections that will be preserved across data syncs</p>
        </div>
        <div className="p-8 text-center">
          <Database className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No overrides yet</p>
          <p className="text-xs text-gray-300 mt-1">Edit any transaction or customer to create an override</p>
        </div>
      </Card>

      {/* Sync Schedule */}
      <Card className="p-5 bg-white border border-gray-100 shadow-none">
        <h3 className="font-semibold text-sm text-black mb-3">Sync Schedule</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg flex-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-sm font-medium">Weekly Monday 8:00 AM</p>
              <p className="text-xs text-gray-400">Auto-sync all connected sources</p>
            </div>
          </div>
          <Button variant="outline" size="sm">Configure</Button>
        </div>
      </Card>
    </div>
  )
}
