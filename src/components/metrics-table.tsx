"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MonthlyMetrics } from "@/types/database"
import { formatPercent, formatNumber } from "@/lib/metrics"
import { useCurrency } from "@/lib/currency-context"

type MetricRowDef = {
  label: string
  tooltip: string
  getValue: (m: MonthlyMetrics) => number
  format: 'currency' | 'percent' | 'number' | 'ratio' | 'months'
  highlight?: 'positive' | 'negative' | 'neutral'
  isSection?: boolean
  colorFn?: (v: number) => string
}

const MRR_ROWS: MetricRowDef[] = [
  { label: 'MRR WATERFALL', tooltip: '', getValue: () => 0, format: 'currency', isSection: true },
  { label: 'Beginning MRR', tooltip: 'MRR na początek miesiąca = Ending MRR poprzedniego miesiąca', getValue: m => m.beginningMrr, format: 'currency' },
  { label: '(+) New MRR', tooltip: 'Revenue od nowych klientów (pierwsza płatność ever)', getValue: m => m.newMrr, format: 'currency', highlight: 'positive' },
  { label: '(+) Expansion', tooltip: 'Wzrost wydatków istniejących klientów vs poprzedni miesiąc', getValue: m => m.expansionMrr, format: 'currency', highlight: 'positive' },
  { label: '(+) Reactivation', tooltip: 'Revenue od klientów powracających po przerwie', getValue: m => m.reactivationMrr, format: 'currency', highlight: 'positive' },
  { label: '(-) Contraction', tooltip: 'Spadek wydatków istniejących klientów (downgrade)', getValue: m => -m.contractionMrr, format: 'currency', highlight: 'negative' },
  { label: '(-) Churned MRR', tooltip: 'Utracone revenue od klientów, którzy odeszli', getValue: m => -m.churnedMrr, format: 'currency', highlight: 'negative' },
  { label: '= Net New MRR', tooltip: 'New + Expansion + Reactivation - Contraction - Churned', getValue: m => m.netNewMrr, format: 'currency' },
  { label: 'Ending MRR', tooltip: 'Beginning MRR + Net New MRR', getValue: m => m.endingMrr, format: 'currency' },
  { label: 'MRR Growth', tooltip: 'Procentowa zmiana MRR miesiąc do miesiąca', getValue: m => m.mrrGrowth, format: 'percent',
    colorFn: v => v > 0.05 ? 'text-emerald-600' : v < -0.05 ? 'text-red-600' : 'text-gray-600' },

  { label: 'CUSTOMERS', tooltip: '', getValue: () => 0, format: 'number', isSection: true },
  { label: 'Paying Customers', tooltip: 'Unikalni klienci z ≥1 udaną płatnością', getValue: m => m.customers, format: 'number' },
  { label: '(+) New', tooltip: 'Klienci z pierwszą płatnością ever', getValue: m => m.newCustomers, format: 'number', highlight: 'positive' },
  { label: '(-) Churned', tooltip: 'Klienci z M-1 którzy nie zapłacili w M', getValue: m => -m.churnedCustomers, format: 'number', highlight: 'negative' },
  { label: 'Churn Rate', tooltip: 'Churned / Paying[M-1]. Benchmark: 3-5% good, >10% bad', getValue: m => m.churnRate, format: 'percent',
    colorFn: v => v > 0.30 ? 'text-red-600 font-semibold' : v > 0.15 ? 'text-amber-600' : 'text-emerald-600' },

  { label: 'UNIT ECONOMICS', tooltip: '', getValue: () => 0, format: 'currency', isSection: true },
  { label: 'ARPU', tooltip: 'Average Revenue Per User = Revenue / Paying Customers', getValue: m => m.arpu, format: 'currency' },
  { label: 'LTV (avg)', tooltip: 'Średni all-time LTV aktywnych klientów', getValue: m => m.ltvAvg, format: 'currency' },
  { label: 'LTV (median)', tooltip: 'Mediana LTV — lepiej pokazuje typowego klienta', getValue: m => m.ltvMedian, format: 'currency' },
  { label: 'CAC', tooltip: 'Ad Spend ($) / New Paid Customers', getValue: m => m.cac, format: 'currency' },
  { label: 'LTV:CAC', tooltip: '>3x zdrowe, >5x excellent', getValue: m => m.ltvCacRatio, format: 'ratio',
    colorFn: v => v >= 5 ? 'text-emerald-600 font-semibold' : v >= 3 ? 'text-emerald-500' : v >= 1 ? 'text-amber-600' : 'text-red-600' },
  { label: 'Payback', tooltip: 'CAC / ARPU — ile miesięcy na odzyskanie kosztu pozyskania', getValue: m => m.paybackMonths, format: 'months' },
]

export function MetricsTable({ data }: { data: MonthlyMetrics[] }) {
  const { formatCurrency } = useCurrency()

  function formatValue(v: number, format: MetricRowDef['format']): string {
    switch (format) {
      case 'currency': return formatCurrency(v)
      case 'percent': return formatPercent(v)
      case 'number': return formatNumber(v)
      case 'ratio': return `${v.toFixed(1)}x`
      case 'months': return `${v.toFixed(1)} mo`
    }
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 border-black">
            <TableHead className="w-[200px] text-black font-bold">Metric</TableHead>
            {data.map(d => (
              <TableHead key={d.month} className="text-center text-black font-bold min-w-[100px]">
                {d.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {MRR_ROWS.map((row, ri) => {
            if (row.isSection) {
              return (
                <TableRow key={ri} className="bg-gray-50 border-t-2 border-gray-200">
                  <TableCell colSpan={data.length + 1} className="font-bold text-xs uppercase tracking-widest text-gray-500 py-2">
                    {row.label}
                  </TableCell>
                </TableRow>
              )
            }
            const isBold = row.label.startsWith('=') || row.label.startsWith('Ending') || row.label === 'Net New MRR'
            return (
              <TableRow key={ri} className="hover:bg-gray-50/50">
                <TableCell className={cn("text-sm", isBold ? "font-bold" : "")}>
                  <div className="flex items-center gap-1.5">
                    {row.label}
                    {row.tooltip && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-gray-300" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[280px] text-xs">
                          {row.tooltip}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {row.highlight === 'positive' && <Badge variant="outline" className="text-[9px] py-0 px-1 text-emerald-600 border-emerald-200">+</Badge>}
                    {row.highlight === 'negative' && <Badge variant="outline" className="text-[9px] py-0 px-1 text-red-500 border-red-200">-</Badge>}
                  </div>
                </TableCell>
                {data.map(d => {
                  const v = row.getValue(d)
                  const colorClass = row.colorFn ? row.colorFn(row.label.startsWith('(-)') ? -v : v) : ''
                  return (
                    <TableCell key={d.month} className={cn(
                      "text-center text-sm tabular-nums",
                      isBold ? "font-bold" : "",
                      colorClass,
                      d.month === '2026-03' ? "bg-amber-50/50" : ""
                    )}>
                      {formatValue(v, row.format)}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
