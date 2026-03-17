"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateRangePicker, DEFAULT_RANGE, filterByDateRange, type DateRange } from "@/components/date-range-picker"
import type { DemoTransaction } from "@/lib/demo-transactions"
import { useCurrency } from "@/lib/currency-context"
import { useTransactions } from "@/lib/use-data"
import { Search, ArrowUpDown, Download, Filter, Database, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

type SortKey = 'date' | 'email' | 'amount' | 'plan' | 'status'
type SortDir = 'asc' | 'desc'

export default function TransactionsPage() {
  const { formatCurrency } = useCurrency()
  const { data: DEMO_TRANSACTIONS, source: dataSource, refetch } = useTransactions()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_RANGE)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const filtered = useMemo(() => {
    let data = filterByDateRange(DEMO_TRANSACTIONS, dateRange)
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(t => t.email.includes(q) || t.company.toLowerCase().includes(q) || t.plan.toLowerCase().includes(q) || (t.invoiceNumber || '').toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') data = data.filter(t => t.status === statusFilter)
    if (sourceFilter !== 'all') data = data.filter(t => t.source === sourceFilter)
    if (typeFilter !== 'all') data = data.filter(t => t.type === typeFilter)

    data.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'amount') return (a.amount - b.amount) * mul
      return a[sortKey].localeCompare(b[sortKey]) * mul
    })
    return data
  }, [dateRange, search, statusFilter, sourceFilter, typeFilter, sortKey, sortDir])

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const totalRev = filtered.filter(t => t.status === 'succeeded').reduce((s, t) => s + t.amount, 0)

  const handleDelete = async (txId: string) => {
    if (!supabase || dataSource !== 'supabase') return
    if (!confirm('Delete this transaction? This cannot be undone.')) return
    setDeleting(txId)
    try {
      const { error } = await (supabase as any).from('transactions').delete().eq('id', txId)
      if (error) throw error
      toast.success('Transaction deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(0)
  }

  const SortableHead = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <TableHead
      className="font-bold text-black cursor-pointer hover:bg-gray-50 select-none"
      onClick={() => toggleSort(k)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? 'text-black' : 'text-gray-300'}`} />
      </div>
    </TableHead>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black tracking-tight">Raw Data — Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Source data behind all metrics · {filtered.length} transactions · {formatCurrency(totalRev)} revenue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={r => { setDateRange(r); setPage(0) }} />
          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 bg-white border border-gray-100 shadow-none">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search email, company, plan, invoice #..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              className="pl-8 h-8 text-xs bg-gray-50 border-gray-200"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            {(['all', 'succeeded', 'failed', 'refunded'] as const).map(s => (
              <Badge
                key={s}
                variant="outline"
                className={`cursor-pointer text-[10px] ${statusFilter === s ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`}
                onClick={() => { setStatusFilter(s); setPage(0) }}
              >
                {s === 'all' ? 'All status' : s}
              </Badge>
            ))}
            <span className="text-gray-200 mx-1">|</span>
            {(['all', 'stripe', 'invoice'] as const).map(s => (
              <Badge
                key={s}
                variant="outline"
                className={`cursor-pointer text-[10px] ${sourceFilter === s ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`}
                onClick={() => { setSourceFilter(s); setPage(0) }}
              >
                {s === 'all' ? 'All sources' : s}
              </Badge>
            ))}
            <span className="text-gray-200 mx-1">|</span>
            {(['all', 'monthly', 'annual', 'one_time'] as const).map(s => (
              <Badge
                key={s}
                variant="outline"
                className={`cursor-pointer text-[10px] ${typeFilter === s ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`}
                onClick={() => { setTypeFilter(s); setPage(0) }}
              >
                {s === 'all' ? 'All types' : s.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Transactions', value: String(filtered.length) },
          { label: 'Succeeded', value: String(filtered.filter(t => t.status === 'succeeded').length) },
          { label: 'Failed', value: String(filtered.filter(t => t.status === 'failed').length) },
          { label: 'Total Revenue', value: formatCurrency(totalRev) },
          { label: 'Unique Customers', value: String(new Set(filtered.map(t => t.email)).size) },
        ].map(s => (
          <Card key={s.label} className="p-3 bg-white border border-gray-100 shadow-none text-center">
            <p className="text-[10px] text-gray-500 uppercase">{s.label}</p>
            <p className="text-lg font-bold">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card className="bg-white border border-gray-100 shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-black">
                <TableHead className="font-bold text-black w-[60px]">#</TableHead>
                <SortableHead k="date">Date</SortableHead>
                <SortableHead k="email">Customer</SortableHead>
                <SortableHead k="amount">Amount</SortableHead>
                <SortableHead k="plan">Plan</SortableHead>
                <SortableHead k="status">Status</SortableHead>
                <TableHead className="font-bold text-black">Source</TableHead>
                <TableHead className="font-bold text-black">Type</TableHead>
                <TableHead className="font-bold text-black">Invoice #</TableHead>
                {dataSource === 'supabase' && <TableHead className="font-bold text-black w-[40px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((tx, i) => (
                <TableRow key={tx.id} className="hover:bg-gray-50/50">
                  <TableCell className="text-[10px] text-gray-400 font-mono">{page * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="text-xs font-mono">{tx.date}</TableCell>
                  <TableCell>
                    <div>
                      <span className="text-xs font-medium">{tx.company}</span>
                      <span className="block text-[10px] text-gray-400">{tx.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-right tabular-nums">
                    {tx.status === 'succeeded' ? formatCurrency(tx.amount) :
                     <span className="text-gray-400 line-through">{formatCurrency(tx.amount)}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] font-mono">{tx.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      tx.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700 text-[10px]' :
                      tx.status === 'failed' ? 'bg-red-100 text-red-700 text-[10px]' :
                      'bg-amber-100 text-amber-700 text-[10px]'
                    }>{tx.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px]">{tx.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[9px] ${
                      tx.type === 'annual' ? 'border-[#D9FD13] bg-[#D9FD13]/10' :
                      tx.type === 'one_time' ? 'border-purple-200 bg-purple-50' : ''
                    }`}>{tx.type}</Badge>
                  </TableCell>
                  <TableCell className="text-[10px] text-gray-400 font-mono">{tx.invoiceNumber || '—'}</TableCell>
                  {dataSource === 'supabase' && (
                    <TableCell>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        disabled={deleting === tx.id}
                        className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = page < 3 ? i : page + i - 2
              if (p >= totalPages) return null
              return (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className={`h-7 w-7 p-0 text-xs ${p === page ? 'bg-black text-white' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p + 1}
                </Button>
              )
            })}
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
