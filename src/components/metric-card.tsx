"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string
  subtitle?: string
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  className?: string
  variant?: 'default' | 'highlight' | 'warning' | 'danger'
}

export function MetricCard({ title, value, subtitle, change, changeLabel, icon, className, variant = 'default' }: MetricCardProps) {
  const borderColors = {
    default: 'border-gray-100',
    highlight: 'border-[#D9FD13]',
    warning: 'border-amber-200',
    danger: 'border-red-200',
  }

  return (
    <Card className={cn(
      "p-4 bg-white border-2 shadow-none hover:shadow-sm transition-shadow",
      borderColors[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-black tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        {icon && <div className="text-gray-300">{icon}</div>}
      </div>
      {change !== undefined && (
        <div className="mt-3 flex items-center gap-1.5">
          {change > 0 ? (
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          ) : change < 0 ? (
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <Minus className="w-3.5 h-3.5 text-gray-400" />
          )}
          <span className={cn(
            "text-xs font-semibold",
            change > 0 ? "text-emerald-600" : change < 0 ? "text-red-600" : "text-gray-500"
          )}>
            {change > 0 ? '+' : ''}{(change * 100).toFixed(1)}%
          </span>
          {changeLabel && <span className="text-xs text-gray-400">{changeLabel}</span>}
        </div>
      )}
    </Card>
  )
}
