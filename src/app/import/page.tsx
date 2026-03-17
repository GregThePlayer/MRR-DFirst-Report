"use client"

import { useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight, X, Loader2 } from "lucide-react"

type ImportStep = 'upload' | 'preview' | 'mapping' | 'importing' | 'done'

export default function ImportPage() {
  const [step, setStep] = useState<ImportStep>('upload')
  const [fileName, setFileName] = useState("")
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setFileName(file.name)
      setStep('preview')
    }
  }, [])

  const STEPS = [
    { key: 'upload', label: 'Upload File' },
    { key: 'preview', label: 'Preview Data' },
    { key: 'mapping', label: 'Map Columns' },
    { key: 'importing', label: 'Import' },
    { key: 'done', label: 'Done' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black tracking-tight">Import Data</h1>
        <p className="text-sm text-gray-500 mt-0.5">Import transactions from Stripe CSV, invoice XLSX, or other sources</p>
      </div>

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

      {step === 'upload' && (
        <>
          {/* Drag & Drop Zone */}
          <Card
            className={`p-12 border-2 border-dashed shadow-none text-center cursor-pointer transition-colors ${
              dragOver ? 'border-[#D9FD13] bg-[#D9FD13]/5' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">
              Drag & drop your file here
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports .csv, .xlsx, .xls files
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => { setFileName("stripe_export.csv"); setStep('preview') }}>
              Or browse files
            </Button>
          </Card>

          {/* Quick Import Templates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 bg-white border border-gray-100 shadow-none hover:border-gray-200 cursor-pointer transition-colors"
              onClick={() => { setFileName("Stripe CSV"); setStep('preview') }}>
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
              onClick={() => { setFileName("Taxxo Invoices"); setStep('preview') }}>
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
              onClick={() => { setFileName("Manual Entry"); setStep('preview') }}>
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
              <Badge variant="outline" className="text-[10px]">Preview</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { date: '2025-09-01', customer: 'mark***@agency.com', amount: '$166.00', plan: 'PRO [1M]', status: 'succeeded' },
                  { date: '2025-09-01', customer: 'anna***@euvic.com', amount: '$999.00', plan: 'ENTERPRISE [1M]', status: 'succeeded' },
                  { date: '2025-09-02', customer: 'tom@***mccann.pl', amount: '$83.00', plan: 'Advanced [1m]', status: 'succeeded' },
                  { date: '2025-09-03', customer: 'kate***@ort.pl', amount: '$33.00', plan: 'STARTER [1M]', status: 'succeeded' },
                  { date: '2025-09-04', customer: 'jan.***@startup.io', amount: '$83.00', plan: 'Advanced [1m]', status: 'failed' },
                ].map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{r.date}</TableCell>
                    <TableCell className="text-sm">{r.customer}</TableCell>
                    <TableCell className="text-sm font-medium">{r.amount}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.plan}</Badge></TableCell>
                    <TableCell>
                      <Badge className={r.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-gray-400 mt-2">Showing first 5 of ~1,134 rows</p>
          </div>
          <div className="p-4 border-t border-gray-100 flex justify-between">
            <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
            <Button className="bg-black text-white hover:bg-gray-800" onClick={() => setStep('mapping')}>
              Continue to Column Mapping <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'mapping' && (
        <Card className="bg-white border border-gray-100 shadow-none p-6">
          <h3 className="font-semibold text-sm mb-4">Column Mapping</h3>
          <p className="text-xs text-gray-500 mb-4">
            Map source columns to system fields. Unmapped columns will be stored in raw_data.
          </p>
          <div className="space-y-3">
            {[
              { source: 'Date', target: 'transaction_date', auto: true },
              { source: 'Customer email', target: 'customer (email)', auto: true },
              { source: 'Kwota zakupu', target: 'amount_usd', auto: true },
              { source: 'Charge status', target: 'status', auto: true },
              { source: 'Plan', target: 'product (via alias)', auto: true },
              { source: 'Subskrypcja', target: 'is_subscription', auto: true },
              { source: 'Czy to pierwsza płatność', target: 'is_first_payment', auto: true },
            ].map(m => (
              <div key={m.source} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <Badge variant="outline" className="font-mono text-xs min-w-[160px]">{m.source}</Badge>
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <Badge className="bg-black text-white text-xs">{m.target}</Badge>
                {m.auto && <Badge className="bg-emerald-100 text-emerald-700 text-[9px] ml-auto">auto-detected</Badge>}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep('preview')}>Back</Button>
            <Button className="bg-black text-white hover:bg-gray-800" onClick={() => setStep('importing')}>
              Start Import <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {step === 'importing' && (
        <Card className="bg-white border border-gray-100 shadow-none p-12 text-center">
          <Loader2 className="w-10 h-10 text-gray-300 mx-auto mb-3 animate-spin" />
          <p className="text-sm font-medium">Importing data...</p>
          <p className="text-xs text-gray-400 mt-1">Processing 1,134 rows · Matching customers · Resolving product aliases</p>
          <Button className="mt-4 bg-black text-white hover:bg-gray-800" onClick={() => setStep('done')}>
            Simulate Complete
          </Button>
        </Card>
      )}

      {step === 'done' && (
        <Card className="bg-white border border-gray-100 shadow-none p-12 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-lg font-bold">Import Complete</p>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div>
              <p className="text-2xl font-bold">1,134</p>
              <p className="text-xs text-gray-400">Transactions</p>
            </div>
            <div>
              <p className="text-2xl font-bold">326</p>
              <p className="text-xs text-gray-400">Customers</p>
            </div>
            <div>
              <p className="text-2xl font-bold">7</p>
              <p className="text-xs text-gray-400">Products matched</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Badge className="bg-emerald-100 text-emerald-700">667 succeeded</Badge>
            <Badge className="bg-red-100 text-red-700">298 failed</Badge>
            <Badge className="bg-amber-100 text-amber-700">169 other</Badge>
          </div>
          <Button className="mt-6 bg-black text-white hover:bg-gray-800" onClick={() => setStep('upload')}>
            Import Another File
          </Button>
        </Card>
      )}
    </div>
  )
}
