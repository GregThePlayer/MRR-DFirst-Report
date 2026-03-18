"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Users,
  Package,
  Database,
  Settings,
  TrendingUp,
  FileSpreadsheet,
  Table2,
  Clock,
} from "lucide-react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { CurrencySwitcher } from "@/components/currency-switcher"
import { useSupabaseStatus } from "@/lib/use-data"
import { useImport } from "@/lib/import-context"

const NAV_ITEMS = [
  { href: "/", label: "MRR Dashboard", icon: TrendingUp },
  { href: "/revenue", label: "Revenue Details", icon: BarChart3 },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/customers/timeline", label: "Activity Timeline", icon: Clock },
  { href: "/products", label: "Products", icon: Package },
  { href: "/transactions", label: "Raw Data", icon: Table2 },
  { href: "/data", label: "Data Sources", icon: Database },
  { href: "/import", label: "Import", icon: FileSpreadsheet },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const dbStatus = useSupabaseStatus()
  const importCtx = useImport()

  return (
    <aside className="w-[240px] min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-[#D9FD13] font-bold text-sm">DF</span>
          </div>
          <div>
            <span className="font-bold text-black text-sm tracking-tight">DFIRST.AI</span>
            <span className="block text-[10px] text-gray-400 -mt-0.5">metrics</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname === item.href || (pathname.startsWith(item.href + "/") && item.href !== "/customers") || (item.href === "/customers" && pathname === "/customers")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-50 hover:text-black"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-[#D9FD13]" : "")} />
              {item.label}
              {item.href === '/import' && importCtx.status === 'importing' && (
                <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {importCtx.progress.current}/{importCtx.progress.total}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100 space-y-3">
        <div>
          <p className="text-[10px] text-gray-400 uppercase font-medium mb-1.5">Display currency</p>
          <CurrencySwitcher />
        </div>
        <div className="text-xs text-gray-400">
          v1.0 · Database
          <br />
          <span className={cn(
            "text-xs font-medium",
            dbStatus === 'connected' ? 'text-emerald-600' :
            dbStatus === 'no_tables' ? 'text-amber-600' :
            dbStatus === 'checking' ? 'text-gray-500' :
            'text-gray-500'
          )}>
            {dbStatus === 'connected' ? 'Supabase connected' :
             dbStatus === 'no_tables' ? 'Run migration first' :
             dbStatus === 'checking' ? 'Checking...' :
             'Demo mode'}
          </span>
        </div>
      </div>
    </aside>
  )
}
