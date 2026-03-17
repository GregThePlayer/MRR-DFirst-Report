"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DEMO_PRODUCTS } from "@/lib/demo-data"
import { formatPercent } from "@/lib/metrics"
import { useCurrency } from "@/lib/currency-context"
import { useMetrics } from "@/lib/use-data"
import { DateRangePicker, DEFAULT_RANGE, filterByDateRange, type DateRange } from "@/components/date-range-picker"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart, Cell } from 'recharts'

export default function RevenuePage() {
  const { formatCurrency, convert, currency } = useCurrency()
  const sym = { USD: '$', EUR: '€', PLN: '' }[currency] || ''
  const { data: allMetrics } = useMetrics()
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_RANGE)
  const data = filterByDateRange(allMetrics, dateRange)

  const revenueChart = data.map(d => ({
    name: d.label,
    monthly: d.monthlyRevenue,
    annual: d.annualRevenue,
    total: d.revenue,
  }))

  const churnChart = data.slice(1).map(d => ({
    name: d.label,
    churnRate: d.churnRate * 100,
    retentionRate: d.retentionRate * 100,
    nrr: d.nrr * 100,
  }))

  const unitEconChart = data.map(d => ({
    name: d.label,
    arpu: d.arpu,
    cac: d.cac,
    ltvCac: d.ltvCacRatio,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black tracking-tight">Revenue Details</h1>
          <p className="text-sm text-gray-500 mt-0.5">Deep dive into revenue, churn, and unit economics</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="revenue" className="data-[state=active]:bg-white rounded-md text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="churn" className="data-[state=active]:bg-white rounded-md text-xs">Churn & Retention</TabsTrigger>
          <TabsTrigger value="unit" className="data-[state=active]:bg-white rounded-md text-xs">Unit Economics</TabsTrigger>
          <TabsTrigger value="plans" className="data-[state=active]:bg-white rounded-md text-xs">Plan Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card className="p-5 bg-white border border-gray-100 shadow-none">
            <h3 className="font-semibold text-sm text-black mb-4">Monthly Revenue — Split</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChart}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} tickFormatter={v => `${sym}${(convert(v)/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="monthly" name="Monthly Plans" stackId="a" fill="#111" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="annual" name="Annual / One-time" stackId="a" fill="#D9FD13" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="bg-white border border-gray-100 shadow-none overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Monthly Revenue Table</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-black">
                  <TableHead className="font-bold text-black">Month</TableHead>
                  <TableHead className="font-bold text-black text-right">Gross Revenue</TableHead>
                  <TableHead className="font-bold text-black text-right">Monthly Plans</TableHead>
                  <TableHead className="font-bold text-black text-right">Annual/One-time</TableHead>
                  <TableHead className="font-bold text-black text-right">Annual %</TableHead>
                  <TableHead className="font-bold text-black text-right">MoM Growth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d, i) => (
                  <TableRow key={d.month}>
                    <TableCell className="font-medium text-sm">{d.label}</TableCell>
                    <TableCell className="text-sm text-right font-bold">{formatCurrency(d.revenue)}</TableCell>
                    <TableCell className="text-sm text-right">{formatCurrency(d.monthlyRevenue)}</TableCell>
                    <TableCell className="text-sm text-right">{formatCurrency(d.annualRevenue)}</TableCell>
                    <TableCell className="text-sm text-right">
                      {d.revenue > 0 ? formatPercent(d.annualRevenue / d.revenue) : '—'}
                    </TableCell>
                    <TableCell className={`text-sm text-right font-semibold ${
                      i === 0 ? 'text-gray-400' :
                      d.mrrGrowth > 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {i === 0 ? '—' : `${d.mrrGrowth > 0 ? '+' : ''}${(d.mrrGrowth * 100).toFixed(1)}%`}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell className="font-bold">TOTAL</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(data.reduce((s, d) => s + d.revenue, 0))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.reduce((s, d) => s + d.monthlyRevenue, 0))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(data.reduce((s, d) => s + d.annualRevenue, 0))}</TableCell>
                  <TableCell className="text-right">{formatPercent(data.reduce((s, d) => s + d.annualRevenue, 0) / data.reduce((s, d) => s + d.revenue, 0))}</TableCell>
                  <TableCell className="text-right text-gray-400">—</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="churn" className="space-y-4">
          <Card className="p-5 bg-white border border-gray-100 shadow-none">
            <h3 className="font-semibold text-sm text-black mb-4">Churn Rate vs NRR</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={churnChart}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="churnRate" name="Churn Rate" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="nrr" name="NRR" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5 bg-white border border-gray-100 shadow-none">
            <h3 className="font-semibold text-sm text-black mb-4">Customer Flow</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.map(d => ({ name: d.label, customers: d.customers, new: d.newCustomers, churned: -d.churnedCustomers }))}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="customers" name="Total Customers" fill="#111" fillOpacity={0.1} stroke="#111" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="unit" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5 bg-white border border-gray-100 shadow-none">
              <h3 className="font-semibold text-sm text-black mb-4">ARPU vs CAC</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={unitEconChart}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} tickFormatter={v => `${sym}${Math.round(convert(v))}`} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="arpu" name="ARPU" fill="#111" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cac" name="CAC" fill="#D9FD13" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-5 bg-white border border-gray-100 shadow-none">
              <h3 className="font-semibold text-sm text-black mb-4">LTV:CAC Ratio</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={unitEconChart}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#888' }} tickFormatter={v => `${v}x`} />
                    <Tooltip formatter={(v) => `${Number(v).toFixed(1)}x`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="ltvCac" name="LTV:CAC" radius={[4, 4, 0, 0]}>
                      {unitEconChart.map((entry, i) => (
                        <Cell key={i} fill={entry.ltvCac >= 5 ? '#10B981' : entry.ltvCac >= 3 ? '#FBBF24' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card className="bg-white border border-gray-100 shadow-none overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-sm">Revenue by Product</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="border-b-2 border-black">
                  <TableHead className="font-bold text-black">Product</TableHead>
                  <TableHead className="font-bold text-black">Type</TableHead>
                  <TableHead className="font-bold text-black text-right">Customers</TableHead>
                  <TableHead className="font-bold text-black text-right">Revenue</TableHead>
                  <TableHead className="font-bold text-black text-right">% Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEMO_PRODUCTS.sort((a, b) => b.revenue - a.revenue).map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{p.billing_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-right">{p.customers}</TableCell>
                    <TableCell className="text-sm text-right font-bold">{formatCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-sm text-right">
                      {formatPercent(p.revenue / DEMO_PRODUCTS.reduce((s, p) => s + p.revenue, 0))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
