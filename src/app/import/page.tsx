"use client"

import { useState, useCallback, useRef, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight, X, Loader2, RefreshCw, StopCircle, BarChart3, Receipt, Activity, LineChart, CalendarDays } from "lucide-react"
import { parseFile, getDefaultMappings, filterRowsByDateRange, TARGET_FIELDS_BY_SOURCE, type RawRow, type ColumnMapping, type SourceType } from "@/lib/import-engine"
import { isSupabaseConfigured } from "@/lib/supabase"
import { useImport } from "@/lib/import-context"

type LocalStep = 'upload' | 'daterange' | 'preview' | 'mapping'

const SOURCE_CARDS: { type: SourceType; label: string; sublabel: string; desc: string; icon: typeof BarChart3; color: string; bgColor: string }[] = [
  { type: 'stripe', label: 'Stripe', sublabel: 'Payment CSV', desc: 'DF.AI Stripe export with transactions, plans, and LTV data', icon: BarChart3, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { type: 'taxxo', label: 'Taxxo', sublabel: 'Invoices XLSX', desc: 'Faktury z systemu Taxxo — Netto, Brutto, PLN amounts', icon: Receipt, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { type: 'mixpanel', label: 'Mixpanel', sublabel: 'Events CSV', desc: 'User events and engagement data (placeholder)', icon: Activity, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  { type: 'ga4', label: 'GA4', sublabel: 'Analytics CSV', desc: 'Google Analytics 4 sessions and traffic sources (placeholder)', icon: LineChart, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
]

export default function ImportPage() {
  const importCtx = useImport()
  const [localStep, setLocalStep] = useState<LocalStep>('upload')
  const [sourceType, setSourceType] = useState<SourceType | null>(null)
  const [fileName, setFileName] = useState("")
  const [dragOver, setDragOver] = useState(false)
  const [allRows, setAllRows] = useState<RawRow[]>([])
  const [rows, setRows] = useState<RawRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Date range state for Stripe
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const isImporting = importCtx.status === 'importing'
  const isDone = importCtx.status === 'done' || importCtx.status === 'cancelled'
  const isError = importCtx.status === 'error'
  const effectiveStep = isImporting ? 'importing' : (isDone || isError) ? 'done' : localStep

  // Initialize default date range (last 6 months)
  const getDefaultDateRange = useCallback(() => {
    const now = new Date()
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    return {
      from: sixMonthsAgo.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    }
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (!sourceType) {
      setError("Please select a source type first")
      return
    }
    setError(null)
    setFileName(file.name)
    try {
      const { rows: parsed, columns: cols } = await parseFile(file)
      if (parsed.length === 0) {
        setError("File is empty or could not be parsed")
        return
      }
      setAllRows(parsed)
      setColumns(cols)
      const detected = getDefaultMappings(sourceType, cols)
      setMappings(detected)

      if (sourceType === 'stripe') {
        // Show date range step
        const defaults = getDefaultDateRange()
        setDateFrom(defaults.from)
        setDateTo(defaults.to)
        setRows(parsed) // will be filtered in daterange step
        setLocalStep('daterange')
      } else {
        setRows(parsed)
        setLocalStep('preview')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file")
    }
  }, [sourceType, getDefaultDateRange])

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

  // Filtered row count for date range step
  const dateColumn = useMemo(() => {
    const dateMapping = mappings.find(m => m.targetField === 'transaction_date' || m.targetField === 'date')
    return dateMapping?.sourceColumn || ''
  }, [mappings])

  const filteredRowCount = useMemo(() => {
    if (!dateColumn || !dateFrom || !dateTo) return allRows.length
    return filterRowsByDateRange(allRows, dateColumn, dateFrom, dateTo).length
  }, [allRows, dateColumn, dateFrom, dateTo])

  const applyDateFilter = () => {
    if (dateColumn && dateFrom && dateTo) {
      const filtered = filterRowsByDateRange(allRows, dateColumn, dateFrom, dateTo)
      setRows(filtered)
    } else {
      setRows(allRows)
    }
    setLocalStep('preview')
  }

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

  const startImport = () => {
    if (!sourceType) return
    const now = new Date().toISOString().slice(0, 10)
    const sourceLabel = `${sourceType}_${now}`
    importCtx.startImport(rows, mappings, sourceLabel, sourceType)
  }

  const reset = () => {
    importCtx.resetImport()
    setLocalStep('upload')
    setSourceType(null)
    setFileName('')
    setAllRows([])
    setRows([])
    setColumns([])
    setMappings([])
    setError(null)
    setDateFrom('')
    setDateTo('')
  }

  const STEPS = [
    { key: 'upload', label: 'Source & Upload' },
    ...(sourceType === 'stripe' ? [{ key: 'daterange', label: 'Date Range' }] : []),
    { key: 'preview', label: 'Preview Data' },
    { key: 'mapping', label: 'Map Columns' },
    { key: 'importing', label: 'Import' },
    { key: 'done', label: 'Done' },
  ]

  const supabaseOk = isSupabaseConfigured()
  const result = importCtx.result
  const targetFields = sourceType ? TARGET_FIELDS_BY_SOURCE[sourceType] : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black tracking-tight">Import Data</h1>
        <p className="text-sm text-gray-500 mt-0.5">Import transactions from Stripe, Taxxo invoices, Mixpanel, or GA4</p>
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
      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              effectiveStep === s.key ? 'bg-black text-white' :
              STEPS.findIndex(x => x.key === effectiveStep) > i ? 'bg-emerald-100 text-emerald-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {STEPS.findIndex(x => x.key === effectiveStep) > i ? <CheckCircle className="w-3 h-3" /> : null}
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

      {effectiveStep === 'upload' && (
        <>
          {/* Source type selection */}
          <div>
            <h3 className="text-sm font-semibold mb-3">1. Select data source</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {SOURCE_CARDS.map(sc => (
                <Card
                  key={sc.type}
                  className={`p-4 bg-white shadow-none cursor-pointer transition-all ${
                    sourceType === sc.type
                      ? 'border-2 border-black ring-1 ring-black'
                      : 'border border-gray-100 hover:border-gray-300'
                  }`}
                  onClick={() => setSourceType(sc.type)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 ${sc.bgColor} rounded-lg flex items-center justify-center shrink-0`}>
                      <sc.icon className={`w-5 h-5 ${sc.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{sc.label}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{sc.sublabel}</p>
                      <p className="text-[11px] text-gray-500 mt-1 leading-tight">{sc.desc}</p>
                    </div>
                  </div>
                  {sourceType === sc.type && (
                    <div className="mt-2 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span className="text-[10px] text-emerald-600 font-medium">Selected</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* File upload */}
          {sourceType && (
            <div>
              <h3 className="text-sm font-semibold mb-3">2. Upload file</h3>
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
                  Drag & drop your {sourceType === 'taxxo' ? 'XLSX' : 'CSV'} file here, or click to browse
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Supports .csv, .xlsx, .xls files
                </p>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Date Range step (Stripe only) */}
      {effectiveStep === 'daterange' && (
        <Card className="bg-white border border-gray-100 shadow-none p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-sm">Filter by Date Range</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Select the date range for your Stripe import. Only rows within this range will be imported.
          </p>

          <div className="flex items-center gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Import from</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-8 text-xs w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Import to</label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-8 text-xs w-[160px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-lg font-bold">{allRows.length}</p>
              <p className="text-[10px] text-gray-400">Total rows in file</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300" />
            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-lg font-bold text-emerald-700">{filteredRowCount}</p>
              <p className="text-[10px] text-emerald-600">Rows in selected range</p>
            </div>
            {allRows.length - filteredRowCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                {allRows.length - filteredRowCount} rows excluded
              </Badge>
            )}
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={reset}>Back</Button>
            <Button className="bg-black text-white hover:bg-gray-800" onClick={applyDateFilter}>
              Continue with {filteredRowCount} rows <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {effectiveStep === 'preview' && (
        <Card className="bg-white border border-gray-100 shadow-none overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-sm">{fileName}</span>
              <Badge variant="outline" className="text-[10px]">{rows.length} rows</Badge>
              <Badge variant="outline" className="text-[10px]">{columns.length} columns</Badge>
              {sourceType && <Badge className="bg-black text-white text-[10px]">{sourceType}</Badge>}
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
                  {columns.slice(0, 8).map(col => {
                    const isAutoMapped = !!mappings.find(m => m.sourceColumn === col && m.autoDetected)
                    return (
                      <TableHead key={col} className={`text-xs whitespace-nowrap ${isAutoMapped ? 'bg-emerald-50' : ''}`}>
                        {col}
                        {mappings.find(m => m.sourceColumn === col) && (
                          <span className="block text-[9px] text-emerald-600 font-normal">
                            &rarr; {mappings.find(m => m.sourceColumn === col)?.targetField}
                          </span>
                        )}
                      </TableHead>
                    )
                  })}
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
            <Button variant="outline" onClick={() => {
              if (sourceType === 'stripe') setLocalStep('daterange')
              else reset()
            }}>Back</Button>
            <Button className="bg-black text-white hover:bg-gray-800" onClick={() => setLocalStep('mapping')}>
              Continue to Column Mapping <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {effectiveStep === 'mapping' && (
        <Card className="bg-white border border-gray-100 shadow-none p-6">
          <h3 className="font-semibold text-sm mb-1">Column Mapping — {sourceType?.toUpperCase()}</h3>
          <p className="text-xs text-gray-500 mb-4">
            Map source columns to system fields. Unmapped columns are stored in raw_data.
            <span className="text-emerald-600 font-medium"> {mappings.filter(m => m.autoDetected).length} auto-detected.</span>
          </p>
          <div className="space-y-2">
            {columns.map(col => {
              const mapping = mappings.find(m => m.sourceColumn === col)
              return (
                <div key={col} className={`flex items-center gap-3 p-2 rounded ${mapping?.autoDetected ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                  <Badge variant="outline" className="font-mono text-xs min-w-[180px] justify-start truncate max-w-[240px]">{col}</Badge>
                  <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                  <select
                    className="text-xs border rounded px-2 py-1.5 bg-white min-w-[180px]"
                    value={mapping?.targetField || ''}
                    onChange={e => updateMapping(col, e.target.value)}
                  >
                    <option value="">— Skip —</option>
                    {targetFields.filter(f => f.value).map(f => (
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

          {!mappings.find(m => m.targetField === 'transaction_date') && sourceType !== 'mixpanel' && sourceType !== 'ga4' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-xs text-amber-800">Transaction Date is not mapped — this field is required.</p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setLocalStep('preview')}>Back</Button>
            <Button
              className="bg-black text-white hover:bg-gray-800"
              onClick={startImport}
              disabled={
                (sourceType === 'stripe' || sourceType === 'taxxo') &&
                (!mappings.find(m => m.targetField === 'transaction_date') || !mappings.find(m => m.targetField === 'amount'))
              }
            >
              Start Import ({rows.length} rows) <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {effectiveStep === 'importing' && (
        <Card className="bg-white border border-gray-100 shadow-none p-12 text-center">
          <Loader2 className="w-10 h-10 text-gray-300 mx-auto mb-3 animate-spin" />
          <p className="text-sm font-medium">Importing data...</p>
          <p className="text-xs text-gray-400 mt-1">
            Processing {importCtx.progress.current} / {importCtx.progress.total} rows
          </p>
          <div className="w-64 mx-auto mt-4 bg-gray-100 rounded-full h-2">
            <div
              className="bg-black rounded-full h-2 transition-all"
              style={{ width: `${importCtx.progress.total > 0 ? (importCtx.progress.current / importCtx.progress.total * 100) : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-2">You can navigate to other pages — import continues in the background</p>
          <Button
            variant="outline"
            className="mt-4 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={importCtx.cancelImport}
          >
            <StopCircle className="w-4 h-4 mr-1" /> Cancel Import
          </Button>
        </Card>
      )}

      {effectiveStep === 'done' && (
        <Card className="bg-white border border-gray-100 shadow-none p-12 text-center">
          {importCtx.status === 'cancelled' ? (
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          ) : result && result.imported > 0 ? (
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          ) : isError ? (
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          ) : (
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          )}

          <p className="text-lg font-bold">
            {importCtx.status === 'cancelled' ? 'Import Cancelled' :
             isError ? 'Import Error' :
             result && result.imported > 0 ? 'Import Complete' : 'No rows imported'}
          </p>

          {isError && importCtx.error && (
            <p className="text-sm text-red-600 mt-2">{importCtx.error}</p>
          )}

          {result && (
            <>
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
                {importCtx.status === 'cancelled' && <Badge className="bg-red-100 text-red-700">Cancelled</Badge>}
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
            </>
          )}

          <Button className="mt-6 bg-black text-white hover:bg-gray-800" onClick={reset}>
            <RefreshCw className="w-4 h-4 mr-1" /> Import Another File
          </Button>
        </Card>
      )}
    </div>
  )
}
