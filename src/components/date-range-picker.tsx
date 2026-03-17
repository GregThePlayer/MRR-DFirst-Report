"use client"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Calendar, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DateRange {
  from: string  // YYYY-MM
  to: string    // YYYY-MM
  label: string
}

const PRESETS: DateRange[] = [
  { from: '2025-09', to: '2026-03', label: 'All data (Sep 25 – Mar 26)' },
  { from: '2025-09', to: '2025-12', label: 'Q4 2025 (Sep – Dec)' },
  { from: '2026-01', to: '2026-03', label: 'Q1 2026 (Jan – Mar)' },
  { from: '2025-12', to: '2026-03', label: 'Last 4 months' },
  { from: '2026-02', to: '2026-03', label: 'Last 2 months' },
]

const ALL_MONTHS = [
  '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03',
]

const MONTH_LABELS: Record<string, string> = {
  '2025-09': 'Sep 25', '2025-10': 'Oct 25', '2025-11': 'Nov 25', '2025-12': 'Dec 25',
  '2026-01': 'Jan 26', '2026-02': 'Feb 26', '2026-03': 'Mar 26',
}

interface Props {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [selectingFrom, setSelectingFrom] = useState(true)
  const [tempFrom, setTempFrom] = useState(value.from)

  const handleMonthClick = (month: string) => {
    if (selectingFrom) {
      setTempFrom(month)
      setSelectingFrom(false)
    } else {
      const from = month < tempFrom ? month : tempFrom
      const to = month < tempFrom ? tempFrom : month
      const label = `${MONTH_LABELS[from]} – ${MONTH_LABELS[to]}`
      onChange({ from, to, label })
      setSelectingFrom(true)
      setOpen(false)
    }
  }

  const handlePreset = (preset: DateRange) => {
    onChange(preset)
    setSelectingFrom(true)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium border border-gray-200 rounded-md bg-white hover:bg-gray-50 transition-colors">
        <Calendar className="w-3.5 h-3.5 text-gray-500" />
        {value.label}
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="end">
        {/* Presets */}
        <div className="p-3 border-b border-gray-100">
          <p className="text-[10px] font-medium text-gray-400 uppercase mb-2">Quick ranges</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map(p => (
              <Badge
                key={p.label}
                variant="outline"
                className={cn(
                  "cursor-pointer text-[10px] hover:bg-gray-50",
                  value.from === p.from && value.to === p.to ? "bg-black text-white border-black hover:bg-gray-800" : ""
                )}
                onClick={() => handlePreset(p)}
              >
                {p.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Month Grid */}
        <div className="p-3">
          <p className="text-[10px] font-medium text-gray-400 uppercase mb-2">
            {selectingFrom ? 'Select start month' : `From ${MONTH_LABELS[tempFrom]} → select end month`}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {ALL_MONTHS.map(month => {
              const isInRange = month >= value.from && month <= value.to
              const isEndpoint = month === value.from || month === value.to
              const isSelecting = !selectingFrom && month >= tempFrom
              return (
                <button
                  key={month}
                  onClick={() => handleMonthClick(month)}
                  className={cn(
                    "px-2 py-1.5 text-xs rounded-md transition-colors",
                    isEndpoint ? "bg-black text-white font-semibold" :
                    isInRange ? "bg-gray-100 text-black" :
                    isSelecting ? "bg-[#D9FD13]/20 text-black" :
                    "hover:bg-gray-50 text-gray-600"
                  )}
                >
                  {MONTH_LABELS[month]}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export const DEFAULT_RANGE: DateRange = { from: '2025-09', to: '2026-03', label: 'All data (Sep 25 – Mar 26)' }

export function filterByDateRange<T extends { month: string }>(data: T[], range: DateRange): T[] {
  return data.filter(d => d.month >= range.from && d.month <= range.to)
}
