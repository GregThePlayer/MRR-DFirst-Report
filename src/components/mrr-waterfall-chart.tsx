"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import type { MonthlyMetrics } from '@/types/database'
import { useCurrency } from '@/lib/currency-context'

interface Props {
  data: MonthlyMetrics[]
}

const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', PLN: '' }

export function MrrWaterfallChart({ data }: Props) {
  const { formatCurrency, currency, convert } = useCurrency()
  const sym = CURRENCY_SYMBOLS[currency] || ''
  const chartData = data.map(d => ({
    name: d.label,
    newMrr: d.newMrr,
    expansion: d.expansionMrr,
    reactivation: d.reactivationMrr,
    contraction: -d.contractionMrr,
    churned: -d.churnedMrr,
    netNew: d.netNewMrr,
  }))

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
          <YAxis tick={{ fontSize: 11, fill: '#888' }} tickFormatter={v => `${sym}${(convert(v) / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(value, name) => [formatCurrency(Math.abs(Number(value))), name]}
            contentStyle={{ borderRadius: 8, border: '1px solid #eee', fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke="#ddd" />
          <Bar dataKey="newMrr" name="New MRR" stackId="a" fill="#4ADE80" radius={[0, 0, 0, 0]} />
          <Bar dataKey="expansion" name="Expansion" stackId="a" fill="#34D399" />
          <Bar dataKey="reactivation" name="Reactivation" stackId="a" fill="#60A5FA" />
          <Bar dataKey="contraction" name="Contraction" stackId="a" fill="#FBBF24" />
          <Bar dataKey="churned" name="Churned" stackId="a" fill="#F87171" radius={[0, 0, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MrrTrendChart({ data }: Props) {
  const { formatCurrency, currency, convert } = useCurrency()
  const sym = CURRENCY_SYMBOLS[currency] || ''
  const chartData = data.map(d => ({
    name: d.label,
    mrr: d.endingMrr,
  }))

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} />
          <YAxis tick={{ fontSize: 11, fill: '#888' }} tickFormatter={v => `${sym}${(convert(v) / 1000).toFixed(0)}k`} />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), 'Ending MRR']}
            contentStyle={{ borderRadius: 8, border: '1px solid #eee', fontSize: 12 }}
          />
          <Bar dataKey="mrr" name="Ending MRR" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={i === chartData.length - 1 ? '#D9FD13' : '#111'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
