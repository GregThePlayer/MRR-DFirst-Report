"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DateRangePicker, DEFAULT_RANGE, type DateRange } from "@/components/date-range-picker"
import type { DemoCustomerFull } from "@/lib/demo-transactions"
import { useCurrency } from "@/lib/currency-context"
import { useCustomers, useTransactions } from "@/lib/use-data"
import {
  Search, Plus, Edit2, Building2, DollarSign, Package, Calendar,
  ArrowUpDown, Filter, Users, TrendingUp, ChevronLeft, ChevronRight, Mail, Phone, Hash
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type SortKey = 'company' | 'totalRevenue' | 'transactions' | 'activeMonths' | 'firstPayment' | 'lastPayment'
type SortDir = 'asc' | 'desc'

export default function CustomersPage() {
  const { formatCurrency, convert, currency } = useCurrency()
  const sym = { USD: '$', EUR: '€', PLN: '' }[currency] || ''
  const { data: DEMO_CUSTOMERS_FULL, loading } = useCustomers()
  const { data: allTransactions } = useTransactions()
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_RANGE)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [tagFilter, setTagFilter] = useState<string>("all")
  const [sortKey, setSortKey] = useState<SortKey>("totalRevenue")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(0)
  const [selectedCustomer, setSelectedCustomer] = useState<DemoCustomerFull | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const PAGE_SIZE = 25

  const filtered = useMemo(() => {
    let data = [...DEMO_CUSTOMERS_FULL]
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(c =>
        c.email.includes(q) || c.company.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) || c.nip.includes(q)
      )
    }
    if (statusFilter !== 'all') data = data.filter(c => c.status === statusFilter)
    if (tagFilter !== 'all') data = data.filter(c => c.tags.includes(tagFilter))

    data.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'totalRevenue' || sortKey === 'transactions' || sortKey === 'activeMonths') {
        return (a[sortKey] - b[sortKey]) * mul
      }
      return (a[sortKey] || '').localeCompare(b[sortKey] || '') * mul
    })
    return data
  }, [search, statusFilter, tagFilter, sortKey, sortDir])

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  // Monthly customer counts
  const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03']
  const monthLabels: Record<string, string> = {
    '2025-09': 'Sep 25', '2025-10': 'Oct 25', '2025-11': 'Nov 25', '2025-12': 'Dec 25',
    '2026-01': 'Jan 26', '2026-02': 'Feb 26', '2026-03': 'Mar 26',
  }
  const monthlyCounts = months.map(mo => {
    const active = new Set(allTransactions.filter(t => t.month === mo && t.status === 'succeeded').map(t => t.email))
    const newCusts = new Set(allTransactions.filter(t => t.month === mo && t.isFirst && t.status === 'succeeded').map(t => t.email))
    return { month: mo, label: monthLabels[mo], active: active.size, new: newCusts.size }
  })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(0)
  }

  const SortableHead = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead
      className={`font-bold text-black cursor-pointer hover:bg-gray-50 select-none ${className}`}
      onClick={() => toggleSort(k)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? 'text-black' : 'text-gray-300'}`} />
      </div>
    </TableHead>
  )

  const allTags = Array.from(new Set(DEMO_CUSTOMERS_FULL.flatMap(c => c.tags)))

  // Customer transactions for detail view
  const customerTx = selectedCustomer
    ? allTransactions.filter(t => t.email === selectedCustomer.email).sort((a, b) => b.date.localeCompare(a.date))
    : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black tracking-tight">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            CRM · {DEMO_CUSTOMERS_FULL.length} customers · {DEMO_CUSTOMERS_FULL.filter(c => c.status === 'active').length} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button className="bg-black text-white hover:bg-gray-800 h-8 text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Customer
          </Button>
        </div>
      </div>

      {/* Monthly Customer Counts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-gray-100 shadow-none col-span-2">
          <h3 className="font-semibold text-xs text-gray-500 uppercase mb-3">Paying Customers by Month</h3>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyCounts}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="active" name="Active Customers" fill="#111" radius={[3, 3, 0, 0]} />
                <Bar dataKey="new" name="New Customers" fill="#D9FD13" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3 bg-white border border-gray-100 shadow-none text-center">
            <Users className="w-4 h-4 text-gray-400 mx-auto mb-1" />
            <p className="text-xl font-bold">{DEMO_CUSTOMERS_FULL.length}</p>
            <p className="text-[10px] text-gray-400">Total Customers</p>
          </Card>
          <Card className="p-3 bg-white border border-gray-100 shadow-none text-center">
            <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{DEMO_CUSTOMERS_FULL.filter(c => c.status === 'active').length}</p>
            <p className="text-[10px] text-gray-400">Active Now</p>
          </Card>
          <Card className="p-3 bg-white border border-gray-100 shadow-none text-center">
            <DollarSign className="w-4 h-4 text-gray-400 mx-auto mb-1" />
            <p className="text-xl font-bold">{DEMO_CUSTOMERS_FULL.length > 0 ? formatCurrency(DEMO_CUSTOMERS_FULL.reduce((s, c) => s + c.totalRevenue, 0) / DEMO_CUSTOMERS_FULL.length) : formatCurrency(0)}</p>
            <p className="text-[10px] text-gray-400">Avg Revenue</p>
          </Card>
          <Card className="p-3 bg-white border border-gray-100 shadow-none text-center">
            <Calendar className="w-4 h-4 text-gray-400 mx-auto mb-1" />
            <p className="text-xl font-bold">{DEMO_CUSTOMERS_FULL.length > 0 ? (DEMO_CUSTOMERS_FULL.reduce((s, c) => s + c.activeMonths, 0) / DEMO_CUSTOMERS_FULL.length).toFixed(1) : '0'}</p>
            <p className="text-[10px] text-gray-400">Avg Active Months</p>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 bg-white border border-gray-100 shadow-none">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search email, company, contact, NIP..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              className="pl-8 h-8 text-xs bg-gray-50 border-gray-200"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            {(['all', 'active', 'churned'] as const).map(s => (
              <Badge
                key={s}
                variant="outline"
                className={`cursor-pointer text-[10px] ${statusFilter === s ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`}
                onClick={() => { setStatusFilter(s); setPage(0) }}
              >
                {s === 'all' ? 'All' : s}
              </Badge>
            ))}
            <span className="text-gray-200 mx-1">|</span>
            {['all', ...allTags].map(t => (
              <Badge
                key={t}
                variant="outline"
                className={`cursor-pointer text-[10px] ${tagFilter === t ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`}
                onClick={() => { setTagFilter(t); setPage(0) }}
              >
                {t === 'all' ? 'All tags' : t}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Customers Table */}
      <Card className="bg-white border border-gray-100 shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-black">
                <TableHead className="font-bold text-black w-[40px]">#</TableHead>
                <SortableHead k="company">Company</SortableHead>
                <TableHead className="font-bold text-black">Email</TableHead>
                <TableHead className="font-bold text-black">Contact</TableHead>
                <SortableHead k="totalRevenue" className="text-right">Revenue</SortableHead>
                <SortableHead k="transactions" className="text-right">TX</SortableHead>
                <SortableHead k="activeMonths" className="text-right">Active Mo.</SortableHead>
                <SortableHead k="firstPayment">First Pay</SortableHead>
                <SortableHead k="lastPayment">Last Pay</SortableHead>
                <TableHead className="font-bold text-black">Plan</TableHead>
                <TableHead className="font-bold text-black">Status</TableHead>
                <TableHead className="font-bold text-black">Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((c, i) => (
                <TableRow
                  key={c.id}
                  className="hover:bg-gray-50/80 cursor-pointer"
                  onClick={() => setSelectedCustomer(c)}
                >
                  <TableCell className="text-[10px] text-gray-400">{page * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-gray-500">{c.company.charAt(0)}</span>
                      </div>
                      <span className="text-xs font-medium truncate max-w-[140px]">{c.company}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[11px] text-gray-600 font-mono truncate max-w-[160px]">{c.email}</TableCell>
                  <TableCell className="text-xs text-gray-600 truncate max-w-[120px]">{c.contact}</TableCell>
                  <TableCell className="text-xs text-right font-semibold tabular-nums">{formatCurrency(c.totalRevenue)}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{c.transactions}</TableCell>
                  <TableCell className="text-xs text-right tabular-nums">{c.activeMonths}</TableCell>
                  <TableCell className="text-[11px] font-mono text-gray-500">{c.firstPayment}</TableCell>
                  <TableCell className="text-[11px] font-mono text-gray-500">{c.lastPayment}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] font-mono truncate max-w-[100px]">{c.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      c.status === 'active' ? 'bg-emerald-100 text-emerald-700 text-[10px]' :
                      'bg-red-100 text-red-700 text-[10px]'
                    }>{c.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5 flex-wrap">
                      {c.tags.slice(0, 2).map(t => (
                        <Badge key={t} variant="outline" className="text-[8px] py-0">{t}</Badge>
                      ))}
                    </div>
                  </TableCell>
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
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = page < 3 ? i : Math.min(page + i - 3, totalPages - 1)
              if (p >= totalPages || p < 0) return null
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

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer && !editOpen} onOpenChange={(open) => { if (!open) setSelectedCustomer(null) }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <span className="text-[#D9FD13] font-bold">{selectedCustomer.company.charAt(0)}</span>
                  </div>
                  <div>
                    <span className="text-lg">{selectedCustomer.company}</span>
                    <span className="block text-xs text-gray-400 font-normal">{selectedCustomer.email}</span>
                  </div>
                  <Badge className={`ml-auto ${
                    selectedCustomer.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>{selectedCustomer.status}</Badge>
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="bg-gray-100 p-0.5 rounded-lg">
                  <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-white rounded-md">Overview</TabsTrigger>
                  <TabsTrigger value="transactions" className="text-xs data-[state=active]:bg-white rounded-md">Transactions ({customerTx.length})</TabsTrigger>
                  <TabsTrigger value="revenue" className="text-xs data-[state=active]:bg-white rounded-md">Monthly Revenue</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <DollarSign className="w-3 h-3 text-gray-400 mb-1" />
                      <p className="text-lg font-bold">{formatCurrency(selectedCustomer.totalRevenue)}</p>
                      <p className="text-[10px] text-gray-400">Total Revenue</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Hash className="w-3 h-3 text-gray-400 mb-1" />
                      <p className="text-lg font-bold">{selectedCustomer.transactions}</p>
                      <p className="text-[10px] text-gray-400">Transactions</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-3 h-3 text-gray-400 mb-1" />
                      <p className="text-lg font-bold">{selectedCustomer.activeMonths}</p>
                      <p className="text-[10px] text-gray-400">Active Months</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <Package className="w-3 h-3 text-gray-400 mb-1" />
                      <p className="text-sm font-bold">{selectedCustomer.plan}</p>
                      <p className="text-[10px] text-gray-400">Current Plan</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 className="w-3.5 h-3.5" /> {selectedCustomer.company}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-3.5 h-3.5" /> {selectedCustomer.email}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-3.5 h-3.5" /> {selectedCustomer.phone}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-gray-600 text-xs"><strong>NIP:</strong> {selectedCustomer.nip}</div>
                      <div className="text-gray-600 text-xs"><strong>Contact:</strong> {selectedCustomer.contact}</div>
                      <div className="text-gray-600 text-xs"><strong>First payment:</strong> {selectedCustomer.firstPayment}</div>
                      <div className="text-gray-600 text-xs"><strong>Last payment:</strong> {selectedCustomer.lastPayment}</div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {selectedCustomer.tags.map(t => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>

                  <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Customer
                  </Button>
                </TabsContent>

                <TabsContent value="transactions" className="mt-3">
                  {customerTx.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No transactions found</p>
                  ) : (
                    <div className="ml-2 relative max-h-[400px] overflow-y-auto pr-2">
                      {/* Vertical line */}
                      <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gray-200" />

                      {customerTx.map((tx) => (
                        <div key={tx.id} className="relative flex items-start gap-3 pb-3">
                          {/* Dot */}
                          <div className={`relative z-10 w-[13px] h-[13px] rounded-full border-2 border-white shrink-0 mt-1.5 ${
                            tx.status === 'succeeded' ? 'bg-emerald-500' :
                            tx.status === 'refunded' ? 'bg-red-500' :
                            tx.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                          }`} />

                          {/* Entry card */}
                          <div className={`flex-1 p-2.5 bg-white border rounded-lg border-l-4 ${
                            tx.status === 'succeeded' ? 'border-l-emerald-400' :
                            tx.status === 'refunded' ? 'border-l-red-400' :
                            tx.status === 'failed' ? 'border-l-red-400' : 'border-l-amber-400'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-gray-400">{tx.date}</span>
                                <Badge className={`text-[9px] ${
                                  tx.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                }`}>{tx.status}</Badge>
                                <Badge className={`text-[9px] ${
                                  tx.source.toLowerCase().startsWith('stripe') ? 'bg-purple-100 text-purple-700' :
                                  tx.source.toLowerCase().startsWith('taxxo') ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>{tx.source.split('_')[0]}</Badge>
                              </div>
                              <span className={`text-xs font-bold tabular-nums ${
                                tx.status === 'succeeded' ? 'text-emerald-700' :
                                tx.status === 'refunded' ? 'text-red-600' : 'text-gray-500'
                              }`}>
                                {tx.status === 'refunded' ? '-' : ''}{formatCurrency(tx.amount)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[9px]">{tx.plan}</Badge>
                              {tx.invoiceNumber && (
                                <span className="text-[9px] text-gray-400">FV: {tx.invoiceNumber}</span>
                              )}
                              {tx.isFirst && (
                                <Badge className="bg-[#D9FD13] text-black text-[8px]">First</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="revenue" className="mt-3">
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={months.map(mo => ({
                        month: monthLabels[mo],
                        revenue: selectedCustomer.monthlyData[mo] || 0,
                      }))}>
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#888' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#888' }} tickFormatter={v => `${sym}${Math.round(convert(v))}`} />
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="revenue" name="Revenue" fill="#111" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Customer — {selectedCustomer?.company}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Company</Label><Input defaultValue={selectedCustomer?.company} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Contact</Label><Input defaultValue={selectedCustomer?.contact} className="h-8 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Email</Label><Input defaultValue={selectedCustomer?.email} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Phone</Label><Input defaultValue={selectedCustomer?.phone} className="h-8 text-sm" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">NIP</Label><Input defaultValue={selectedCustomer?.nip} className="h-8 text-sm" /></div>
              <div><Label className="text-xs">Tags</Label><Input defaultValue={selectedCustomer?.tags.join(', ')} className="h-8 text-sm" /></div>
            </div>
            <div><Label className="text-xs">Notes</Label><Textarea rows={2} className="text-sm" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button size="sm" className="bg-black text-white hover:bg-gray-800" onClick={() => setEditOpen(false)}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
