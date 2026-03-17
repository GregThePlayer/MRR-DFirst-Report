"use client"

import { useState } from "react"
import { MetricCard } from "@/components/metric-card"
import { MetricsTable } from "@/components/metrics-table"
import { MrrWaterfallChart, MrrTrendChart } from "@/components/mrr-waterfall-chart"
import { DateRangePicker, DEFAULT_RANGE, filterByDateRange, type DateRange } from "@/components/date-range-picker"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPercent } from "@/lib/metrics"
import { useCurrency } from "@/lib/currency-context"
import { useMetrics } from "@/lib/use-data"
import { TrendingUp, Users, DollarSign, AlertTriangle, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { formatCurrency } = useCurrency()
  const { data: allMetrics, source } = useMetrics()
  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_RANGE)
  const data = filterByDateRange(allMetrics, dateRange)
  const latest = data[data.length - 1]
  const prev = data.length > 1 ? data[data.length - 2] : data[0]
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0)
  const avgChurn = data.length > 1 ? data.slice(1).reduce((s, d) => s + d.churnRate, 0) / (data.length - 1) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black tracking-tight">MRR Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time SaaS metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          {source === 'demo' && (
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Demo data
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Mar 26 = partial
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Ending MRR"
          value={formatCurrency(latest.endingMrr)}
          change={latest.mrrGrowth}
          changeLabel="vs prev month"
          icon={<TrendingUp className="w-5 h-5" />}
          variant="highlight"
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          subtitle={`${data.length} months tracked`}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Paying Customers"
          value={String(latest.customers)}
          change={(latest.customers - prev.customers) / prev.customers}
          changeLabel="vs prev month"
          icon={<Users className="w-5 h-5" />}
        />
        <MetricCard
          title="Avg Churn Rate"
          value={formatPercent(avgChurn)}
          subtitle="Benchmark: 3-5%"
          icon={<AlertTriangle className="w-5 h-5" />}
          variant="danger"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 bg-white border border-gray-100 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-black">MRR Waterfall</h3>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400" /> New</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-300" /> Expansion</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-400" /> Reactivation</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400" /> Contraction</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-400" /> Churned</span>
            </div>
          </div>
          <MrrWaterfallChart data={data} />
        </Card>
        <Card className="p-5 bg-white border border-gray-100 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-black">Ending MRR Trend</h3>
            <Badge variant="outline" className="text-[10px]">
              Peak: {formatCurrency(Math.max(...data.map(d => d.endingMrr)))}
            </Badge>
          </div>
          <MrrTrendChart data={data} />
        </Card>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-gray-100 shadow-none">
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Revenue Split</h4>
          <div className="space-y-2">
            {data.map(d => {
              const annualPct = d.revenue > 0 ? d.annualRevenue / d.revenue : 0
              return (
                <div key={d.month} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">{d.label}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-black" style={{ width: `${(1 - annualPct) * 100}%` }} />
                    <div className="h-full bg-[#D9FD13]" style={{ width: `${annualPct * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{formatCurrency(d.revenue)}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-black" /> Monthly</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-[#D9FD13]" /> Annual/One-time</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 shadow-none">
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Customer Flow</h4>
          <div className="space-y-2">
            {data.slice(1).map(d => (
              <div key={d.month} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">{d.label}</span>
                <div className="flex items-center gap-1 flex-1">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] py-0">+{d.newCustomers}</Badge>
                  <ArrowRight className="w-3 h-3 text-gray-300" />
                  <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px] py-0">-{d.churnedCustomers}</Badge>
                  <span className="text-xs text-gray-400 ml-auto">= {d.customers}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 bg-white border border-gray-100 shadow-none">
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-3">Unit Economics</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Avg LTV:CAC</span>
              <span className="text-sm font-bold text-emerald-600">
                {(data.reduce((s, d) => s + d.ltvCacRatio, 0) / data.length).toFixed(1)}x
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Avg Payback</span>
              <span className="text-sm font-bold">
                {(data.reduce((s, d) => s + d.paybackMonths, 0) / data.length).toFixed(1)} mo
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Avg ARPU</span>
              <span className="text-sm font-bold">
                {formatCurrency(data.reduce((s, d) => s + d.arpu, 0) / data.length)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Payment Failure Rate</span>
              <span className="text-sm font-bold text-red-600">
                {formatPercent(data.reduce((s, d) => s + d.paymentFailureRate, 0) / data.length)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Full Metrics Table */}
      <Card className="bg-white border border-gray-100 shadow-none overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-black">Full Monthly Breakdown</h3>
            <p className="text-xs text-gray-400 mt-0.5">All SaaS metrics computed from transaction data. Hover metrics for explanations.</p>
          </div>
          <Link href="/transactions" className="text-xs text-gray-500 hover:text-black underline underline-offset-2">
            View source data →
          </Link>
        </div>
        <MetricsTable data={data} />
      </Card>
    </div>
  )
}
