"use client"

import { createContext, useContext, useState, useRef, useCallback, type ReactNode } from "react"
import { importToSupabase, type RawRow, type ColumnMapping, type ImportResult, type SourceType } from "./import-engine"
import { toast } from "sonner"

export interface ImportSignal {
  cancelled: boolean
}

export type ImportStatus = 'idle' | 'importing' | 'cancelled' | 'done' | 'error'

interface ImportState {
  status: ImportStatus
  progress: { current: number; total: number }
  result: ImportResult | null
  error: string | null
  sourceLabel: string
  sourceType: SourceType | null
}

interface ImportContextValue extends ImportState {
  startImport: (rows: RawRow[], mappings: ColumnMapping[], sourceLabel: string, sourceType?: SourceType) => void
  cancelImport: () => void
  resetImport: () => void
}

const INITIAL_STATE: ImportState = {
  status: 'idle',
  progress: { current: 0, total: 0 },
  result: null,
  error: null,
  sourceLabel: '',
  sourceType: null,
}

const ImportContext = createContext<ImportContextValue | null>(null)

export function ImportProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ImportState>(INITIAL_STATE)
  const signalRef = useRef<ImportSignal>({ cancelled: false })

  const startImport = useCallback((rows: RawRow[], mappings: ColumnMapping[], sourceLabel: string, sourceType: SourceType = 'stripe') => {
    signalRef.current = { cancelled: false }

    setState({
      status: 'importing',
      progress: { current: 0, total: rows.length },
      result: null,
      error: null,
      sourceLabel,
      sourceType,
    })

    toast.info(`Import started: ${rows.length} rows`, { duration: 3000 })

    importToSupabase(rows, mappings, sourceLabel, (current, total) => {
      setState(s => ({ ...s, progress: { current, total } }))
    }, signalRef.current, sourceType)
      .then((result) => {
        if (signalRef.current.cancelled) {
          setState(s => ({ ...s, status: 'cancelled', result }))
          toast.warning(`Import cancelled: ${result.imported} of ${result.totalRows} rows imported`, { duration: 5000 })
        } else {
          setState(s => ({ ...s, status: 'done', result }))
          toast.success(`Import complete: ${result.imported} transactions, ${result.customersCreated} new customers`, { duration: 5000 })
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Import failed'
        setState(s => ({ ...s, status: 'error', error: msg }))
        toast.error(`Import error: ${msg}`, { duration: 5000 })
      })
  }, [])

  const cancelImport = useCallback(() => {
    signalRef.current.cancelled = true
    toast.info('Cancelling import...', { duration: 2000 })
  }, [])

  const resetImport = useCallback(() => {
    signalRef.current = { cancelled: false }
    setState(INITIAL_STATE)
  }, [])

  return (
    <ImportContext.Provider value={{ ...state, startImport, cancelImport, resetImport }}>
      {children}
    </ImportContext.Provider>
  )
}

export function useImport() {
  const ctx = useContext(ImportContext)
  if (!ctx) throw new Error('useImport must be used within ImportProvider')
  return ctx
}
