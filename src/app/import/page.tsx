"use client"

import { useState, useCallback, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight, X, Loader2, RefreshCw } from "lucide-react"
import { parseFile, autoDetectMappings, importToSupabase, type RawRow, type ColumnMapping, type ImportResult } from "@/lib/import-engine"
import { isSupabaseConfigured } from "@/lib/supabase"

type ImportStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'done'

const TARGET_FIELDS = [
  { value: 'transaction_date', label: 'Transaction Date' },
  { value: 'email', label: 'Customer Email' },
  { value: 'amount', label: 'Amount (USD)' },
  { value: 'status', label: 'Status' },
  { value: 'plan', label: 'Plan / Product' },
  { value: 'is_subscription', label: 'Is Subscription' },
  { value: 'is_first_payment', label: 'Is First Payment' },
  { value: 'stripe_charge_id', label: 'Charge ID' },
  { value: 'subscription_value', label: 'Subscription Value' },
  { value: 'ltv', label: 'LTV' },
  { value: 'pay_count', label: 'Pay Count' },
  { value: 'currency', label: 'Currency' },
  { value: 'customer_name', label: 'Customer Name' },
  { value: 'company', label: 'Company' },
  { value: 'invoice_number', label: 'Invoice Number' },
  { value: '', label: '— Skip column —' },
]

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [fileName, setFileName] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [rows, setRows] = useState<RawRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setFileName(file.name)
    try {
      const { rows: parsed, columns: cols } = await parseFile(file)
      if (parsed.length === 0) {
        setError("File is empty or could not be parsed")
        return
      }
      setRows(parsed)
      setColumns(cols)
      const detected = autoDetectMappings(cols)
      setMappings(detected)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file")
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const updateMapping = (sourceColumn: string, newTarget: string) => {
    setMappings(prev => {
      const existing = prev.find(m => m.sourceColumn === sourceColumn)
      if (newTarget === '') {
        return prev.filter(m => m.sourceColumn !== sourceColumn)
      }
      if (existing) {
        return prev.map(m => m.sourceColumn === sourceColumn ? { ...m, targetField: newTarget, autoDetected: false } : m)
      }
      return [...prev, { sourceColumn, targetField: newTarget, autoDetected: false }]
    })
  }

  const startImport = async () => {
    setStep('importing')
    setProgress({ current: 0, total: rows.length })

    const sourceLabel = fileName.toLowerCase().includes('stripe') ? 'stripe' :
      fileName.toLowerCase().includes('invoice') || fileName.toLowerCase().includes('faktur') ? 'invoice' : 'csv_import'

    const res = await importToSupabase(rows, mappings, sourceLabel, (current, total) => {
      setProgress({ current, total })
    })

    setResult(res)
    setStep('done')
  }

  const reset = () => {
    setStep('upload')
    setFileName('')
    setRows([])
    setColumns([])
    setMappings([])
    setResult(null)
    setError(null)
    setProgress({ current: 0, total: 0 })
  }

  const STEPS = [
    { key: 'upload', label: 'Upload File' },
    { key: 'preview', label: 'Preview Data' },
    { key: 'mapping', label: 'Map Columns' },
    { key: 'importing', label: 'Import' },
    { key: 'done', label: 'Done' },
  ]

  const supabaseOk = isSupabaseConfigured()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black tracking-tight">Import Data</h1>
        <p className="text-sm text-gray-500 mt-0.5">Import transactions from Stripe CSV, invoice XLSX, or other sources</p>
      </div>

      {!supabaseOk && (
        <Card className="p-4 bg-amber-50 border-amber-200 shadow-none">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-amber-800 font-medium">Supabase not configured — import will not work. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.</p>
          </div>
        </Card>
      )}

      {/* Steps */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              step === s.key ? 'bg-black text-white' :
              STEPS.findIndex(x => x.key === step) > i ? 'bg-emerald-100 text-emerald-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {STEPS.findIndex(x => x.key === step) > i ? <CheckCircle className="w-3 h-3" /> : null}
              {s.label}
            </div>
            {i < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300" />}
          </div>
        ))}
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200 shadow-none">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </Card>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.tsv" className="hidden" onChange={handleFileInput} />

      {step === 'upload' && (
        <>
          <Card
            className={`p-12 border-2 border-dashed shadow-none text-center cursor-pointer transition-colors ${
              dragOver ? 'border-[#D9FD13] bg-[#D9FD13]/5' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">
              Drag & drop your file here, or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports .csv, .xlsx, .xls files
            </p>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-white border border-gray-100 shadow-none hover:border-gray-200 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Stripe CSV</p>
                  <p className="text-xs text-gray-400">DF.AI Data 2025/2026 export</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-white border border-gray-100 shadow-none hover:border-gray-200 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Invoice XLSX (Taxxo)</p>
                  <p className="text-xs text-gray-400">Faktury z systemu Taxxo</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-white border border-gray-100 shadow-none hover:border-gray-200 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Enterprise Invoices</p>
                  <p className="text-xs text-gray-400">Manual FV for enterprise clients</p>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {step === 'preview' && (
        <Card className="bg-white border border-gray-100 shadow-none overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm">{fileName}</span>
              <Badge variant="outline" className="text-[10px]">{rows.length} rows</Badge>
              <Badge variant="outline" className="text-[10px]">{columns.length} columns</Badge>
              {mappings.length > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">{mappings.length} auto-mapped</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.slice(0, 8).map(col => (
                    <TableHead key={col} className="text-xs whitespace-nowrap">
                      {col}
                      {mappings.find(m => m.sourceColumn === col) && (
                        <span className="block text-[9px] text-emerald-600 font-normal">
                          → {mappings.find(m => m.sourceColumn === col)?.targetField}
                        </span>
                      )}
                    </TableHead>
                  ))}
                  {columns.length > 8 && <TableHead className="text-xs text-gray-400">+{columns.length - 8} more</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 5).map((row, i) => (
                  <TableRow key={i}>
                    {columns.slice(0, 8).map(col => (
                      <TableCell key={col} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                        {String(row[col] ?? '')}
                      </TableCell>
                    ))}
                    {columns.length > 8 && <TableCell className="text-xs text-gray-400">...</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 5 && (
              <p className="text-xs text-gray-400 mt-2">Showing first 5 of {rows.length} rows</p>
            )}
          </div>
          <div className="p-4 border-t border-gray-100 flex justify-between">
            <Button variant="outline" onClick={reset}>Back</Button>
            <Button className="bg-black text-white hover:bg-gray-800" onClick={() => setStep('mapping')}>
              Continue to Column Mapping <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mapping' && (
        <Card className="bg-white border border-gray-100 shadow-none p-6">
          <h3 className="font-semibold text-sm mb-1">Column Mapping</h3>
          <p className="text-xs text-gray-500 mb-4">
            Map source columns to system fields. Unmapped columns are stored in raw_data.
            <span className="text-emerald-600 font-medium"> {mappings.filter(m => m.autoDetected).length} auto-detected.</span>
          </p>
          <div className="space-y-2">
            {columns.map(col => {
              const mapping = mappings.find(m => m.sourceColumn === col)
              return (
                <div key={col} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <Badge variant="outline" className="font-mono text-xs min-w-[180px] justify-start">{col}</Badge>
                  <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                  <select
                    className="text-xs border rounded px-2 py-1.5 bg-white min-w-[180px]"
                    value={mapping?.targetField || ''}
                    onChange={e => updateMapping(col, e.target.value)}
                  >
                    <option value="">— Skip —</option>
                    {TARGET_FIELDS.filter(f => f.value).map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  {mapping?.autoDetected && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-[9px] ml-auto shrink-0">auto</Badge>
                  )}
                </div>
              )
            })}
          </div>

          {!mappings.find(m => m.targetField === 'transaction_date') && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-xs text-amber-800">Transaction Date is not mapped — this field is required.</p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep('preview')}>Back</Button>
            <Button
              className="bg-black text-white hover:bg-gray-800"
              onClick={startImport}
              disabled={!mappings.find(m => m.targetField === 'transaction_date') || !mappings.find(m => m.targetField === 'amount')}
            >
              Start Import ({rows.length} rows) <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'importing' && (
        <Card className="bg-white border border-gray-100 shadow-none p-12 text-center">
          <Loader2 className="w-10 h-10 text-gray-300 mx-auto mb-3 animate-spin" />
          <p className="text-sm font-medium">Importing data...</p>
          <p className="text-xs text-gray-400 mt-1">
            Processing {progress.current} / {progress.total} rows
          </p>
          <div className="w-64 mx-auto mt-4 bg-gray-100 rounded-full h-2">
            <div
              className="bg-black rounded-full h-2 transition-all"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total * 100) : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Matching customers · Resolving product aliases · Deduplicating</p>
        </Card>
      )}

      {step === 'done' && result && (
        <Card className="bg-white border border-gray-100 shadow-none p-12 text-center">
          {result.imported > 0 ? (
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          ) : (
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          )}
          <p className="text-lg font-bold">
            {result.imported > 0 ? 'Import Complete' : 'No rows imported'}
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div>
              <p className="text-2xl font-bold">{result.imported}</p>
              <p className="text-xs text-gray-400">Transactions</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{result.customersCreated + result.customersMatched}</p>
              <p className="text-xs text-gray-400">Customers</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{result.productsMatched}</p>
              <p className="text-xs text-gray-400">Products matched</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge className="bg-emerald-100 text-emerald-700">{result.imported} imported</Badge>
            {result.skipped > 0 && <Badge className="bg-amber-100 text-amber-700">{result.skipped} skipped</Badge>}
            {result.customersCreated > 0 && <Badge className="bg-blue-100 text-blue-700">{result.customersCreated} new customers</Badge>}
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4 max-h-32 overflow-y-auto text-left bg-red-50 rounded p-3">
              <p className="text-xs font-medium text-red-800 mb-1">Errors ({result.errors.length}):</p>
              {result.errors.slice(0, 10).map((err, i) => (
                <p key={i} className="text-[10px] text-red-600">{err}</p>
              ))}
              {result.errors.length > 10 && <p className="text-[10px] text-red-400">...and {result.errors.length - 10} more</p>}
            </div>
          )}

          <Button className="mt-6 bg-black text-white hover:bg-gray-800" onClick={reset}>
            <RefreshCw className="w-4 h-4 mr-1" /> Import Another File
          </Button>
        </Card>
      )}
    </div>
  )
}
