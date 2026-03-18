"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useTransactions } from "@/lib/use-data"
import { useCurrency } from "@/lib/currency-context"
import { Search, Filter, DollarSign, Calendar, ChevronDown, ExternalLink } from "lucide-react"
import Link from "next/link"

type SourceFilter = 'all' | 'stripe' | 'taxxo'

export default function CustomerTimelinePage() {
  const { formatCurrency } = useCurrency()
  const { data: allTransactions, loading } = useTransactions()

  const [search, setSearch] = useState("")
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [visibleCount, setVisibleCount] = useState(50)

  const filtered = useMemo(() => {
    let data = [...allTransactions]

    // Search filter
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(t =>
        t.email.toLowerCase().includes(q) ||
        t.company.toLowerCase().includes(q) ||
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(q))
      )
    }

    // Source filter
    if (sourceFilter !== 'all') {
      data = data.filter(t => t.source.toLowerCase().startsWith(sourceFilter))
    }

    // Date range filter
    if (dateFrom) {
      data = data.filter(t => t.date >= dateFrom)
    }
    if (dateTo) {
      data = data.filter(t => t.date <= dateTo)
    }

    // Sort newest first
    data.sort((a, b) => b.date.localeCompare(a.date))

    return data
  }, [allTransactions, search, sourceFilter, dateFrom, dateTo])

  // Group by date
  const grouped = useMemo(() => {
    const groups: { date: string; entries: typeof filtered }[] = []
    let currentDate = ''
    let currentGroup: typeof filtered = []

    for (const entry of filtered.slice(0, visibleCount)) {
      if (entry.date !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, entries: currentGroup })
        }
        currentDate = entry.date
        currentGroup = [entry]
      } else {
        currentGroup.push(entry)
      }
    }
    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, entries: currentGroup })
    }

    return groups
  }, [filtered, visibleCount])

  const statusColor = (status: string) => {
    if (status === 'succeeded') return 'bg-emerald-100 text-emerald-700'
    if (status === 'refunded') return 'bg-red-100 text-red-700'
    if (status === 'failed') return 'bg-red-100 text-red-700'
    return 'bg-amber-100 text-amber-700'
  }

  const dotColor = (status: string) => {
    if (status === 'succeeded') return 'bg-emerald-500'
    if (status === 'refunded') return 'bg-red-500'
    if (status === 'failed') return 'bg-red-500'
    return 'bg-amber-500'
  }

  const borderColor = (status: string) => {
    if (status === 'succeeded') return 'border-l-emerald-400'
    if (status === 'refunded') return 'border-l-red-400'
    if (status === 'failed') return 'border-l-red-400'
    return 'border-l-amber-400'
  }

  const sourceColor = (source: string) => {
    if (source.toLowerCase().startsWith('stripe')) return 'bg-purple-100 text-purple-700'
    if (source.toLowerCase().startsWith('taxxo')) return 'bg-blue-100 text-blue-700'
    return 'bg-gray-100 text-gray-700'
  }

  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00')
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Stats
  const totalAmount = filtered.reduce((s, t) => s + (t.status === 'succeeded' ? t.amount : 0), 0)
  const uniqueCustomers = new Set(filtered.map(t => t.email)).size

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-black tracking-tight">Customer Activity Timeline</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          All customer transactions in chronological order
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 bg-white border border-gray-100 shadow-none text-center">
          <Calendar className="w-4 h-4 text-gray-400 mx-auto mb-1" />
          <p className="text-xl font-bold">{filtered.length}</p>
          <p className="text-[10px] text-gray-400">Total Transactions</p>
        </Card>
        <Card className="p-3 bg-white border border-gray-100 shadow-none text-center">
          <DollarSign className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
          <p className="text-xl font-bold">{formatCurrency(totalAmount)}</p>
          <p className="text-[10px] text-gray-400">Total Revenue</p>
        </Card>
        <Card className="p-3 bg-white border border-gray-100 shadow-none text-center">
          <Search className="w-4 h-4 text-gray-400 mx-auto mb-1" />
          <p className="text-xl font-bold">{uniqueCustomers}</p>
          <p className="text-[10px] text-gray-400">Unique Customers</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-3 bg-white border border-gray-100 shadow-none">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search email, company, invoice..."
              value={search}
              onChange={e => { setSearch(e.target.value); setVisibleCount(50) }}
              className="pl-8 h-8 text-xs bg-gray-50 border-gray-200"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            {(['all', 'stripe', 'taxxo'] as SourceFilter[]).map(s => (
              <Badge
                key={s}
                variant="outline"
                className={`cursor-pointer text-[10px] ${sourceFilter === s ? 'bg-black text-white border-black' : 'hover:bg-gray-50'}`}
                onClick={() => { setSourceFilter(s); setVisibleCount(50) }}
              >
                {s === 'all' ? 'All Sources' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setVisibleCount(50) }}
              className="h-8 text-xs w-[130px]"
              placeholder="From"
            />
            <span className="text-xs text-gray-400">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setVisibleCount(50) }}
              className="h-8 text-xs w-[130px]"
              placeholder="To"
            />
          </div>
        </div>
      </Card>

      {/* Timeline */}
      {loading ? (
        <Card className="p-12 bg-white border border-gray-100 shadow-none text-center">
          <p className="text-sm text-gray-400">Loading transactions...</p>
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="p-12 bg-white border border-gray-100 shadow-none text-center">
          <p className="text-sm text-gray-400">No transactions found</p>
        </Card>
      ) : (
        <div className="space-y-0">
          {grouped.map((group) => (
            <div key={group.date} className="relative">
              {/* Date header */}
              <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm py-2 px-3 rounded-lg mb-2">
                <p className="text-xs font-bold text-gray-700">{formatDateLabel(group.date)}</p>
              </div>

              {/* Entries */}
              <div className="ml-4 relative">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gray-200" />

                {group.entries.map((tx, idx) => (
                  <div key={tx.id} className="relative flex items-start gap-4 pb-4">
                    {/* Dot */}
                    <div className={`relative z-10 w-[15px] h-[15px] rounded-full border-2 border-white ${dotColor(tx.status)} shrink-0 mt-2`} />

                    {/* Card */}
                    <Card className={`flex-1 p-3 bg-white border shadow-none border-l-4 ${borderColor(tx.status)}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-semibold text-black truncate">
                              {tx.company || tx.email}
                            </p>
                            <Badge className={`${statusColor(tx.status)} text-[9px]`}>{tx.status}</Badge>
                            <Badge className={`${sourceColor(tx.source)} text-[9px]`}>
                              {tx.source.split('_')[0]}
                            </Badge>
                          </div>
                          {tx.company && tx.email && (
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{tx.email}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-[9px] font-mono">{tx.plan}</Badge>
                            {tx.invoiceNumber && (
                              <span className="text-[10px] text-gray-400">Invoice: {tx.invoiceNumber}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold tabular-nums ${
                            tx.status === 'succeeded' ? 'text-emerald-700' :
                            tx.status === 'refunded' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {tx.status === 'refunded' ? '-' : ''}{formatCurrency(tx.amount)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400">
                          {tx.isFirst && <Badge className="bg-[#D9FD13] text-black text-[8px] mr-1">First payment</Badge>}
                          {tx.type}
                        </span>
                        <Link
                          href="/customers"
                          className="text-[10px] text-gray-400 hover:text-black flex items-center gap-0.5"
                        >
                          View customer <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {visibleCount < filtered.length && (
            <div className="text-center py-4">
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setVisibleCount(prev => prev + 50)}
              >
                <ChevronDown className="w-3.5 h-3.5 mr-1" />
                Load more ({filtered.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
