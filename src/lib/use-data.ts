"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { computeMonthlyMetrics } from './metrics'
import type { DemoTransaction, DemoCustomerFull } from './demo-transactions'
import type { Transaction, MarketingMetrics, MonthlyMetrics, Customer, Product, ProductAlias } from '@/types/database'

// ─── Connection status ───
export type DataSource = 'supabase' | 'demo'

interface DataState<T> {
  data: T
  source: DataSource
  loading: boolean
  error: string | null
  refetch: () => void
}

// ─── Metrics Hook ───
export function useMetrics(): DataState<MonthlyMetrics[]> {
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey(k => k + 1), [])
  const [state, setState] = useState<Omit<DataState<MonthlyMetrics[]>, 'refetch'>>({
    data: [],
    source: 'supabase',
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!supabase) {
      setState({ data: [], source: 'demo', loading: false, error: 'Supabase not configured' })
      return
    }

    async function fetchMetrics() {
      try {
        const [txRes, mkRes] = await Promise.all([
          supabase!.from('transactions').select('*').order('transaction_date', { ascending: true }),
          supabase!.from('marketing_metrics').select('*').order('month', { ascending: true }),
        ])

        if (txRes.error) throw txRes.error
        if (mkRes.error) throw mkRes.error

        const transactions = txRes.data as Transaction[]
        const marketing = mkRes.data as MarketingMetrics[]

        if (transactions.length === 0) {
          setState({ data: [], source: 'supabase', loading: false, error: null })
          return
        }

        const computed = computeMonthlyMetrics(transactions, marketing)
        setState({ data: computed, source: 'supabase', loading: false, error: null })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch'
        setState({ data: [], source: 'supabase', loading: false, error: msg })
      }
    }

    fetchMetrics()
  }, [refreshKey])

  return { ...state, refetch }
}

// ─── Transactions Hook ───
export function useTransactions(): DataState<DemoTransaction[]> {
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey(k => k + 1), [])
  const [state, setState] = useState<Omit<DataState<DemoTransaction[]>, 'refetch'>>({
    data: [],
    source: 'supabase',
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!supabase) {
      setState({ data: [], source: 'demo', loading: false, error: 'Supabase not configured' })
      return
    }

    async function fetchTransactions() {
      try {
        const { data, error } = await supabase!
          .from('transactions')
          .select('*, customers(email, company_name), products(display_name)')
          .order('transaction_date', { ascending: false })

        if (error) throw error

        const mapped: DemoTransaction[] = (data || []).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          date: t.transaction_date as string,
          month: t.month as string,
          email: (t.customers as Record<string, unknown>)?.email as string || t.source_id as string || '',
          company: (t.customers as Record<string, unknown>)?.company_name as string || '',
          amount: t.amount_usd as number,
          plan: (t.products as Record<string, unknown>)?.display_name as string || 'Unknown',
          status: t.status as DemoTransaction['status'],
          source: t.source as DemoTransaction['source'],
          type: t.billing_type as DemoTransaction['type'],
          isFirst: t.is_first_payment as boolean,
          invoiceNumber: t.invoice_number as string | undefined,
        }))

        setState({ data: mapped, source: 'supabase', loading: false, error: null })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch'
        setState({ data: [], source: 'supabase', loading: false, error: msg })
      }
    }

    fetchTransactions()
  }, [refreshKey])

  return { ...state, refetch }
}

// ─── Customers Hook ───
export function useCustomers(): DataState<DemoCustomerFull[]> {
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey(k => k + 1), [])
  const [state, setState] = useState<Omit<DataState<DemoCustomerFull[]>, 'refetch'>>({
    data: [],
    source: 'supabase',
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!supabase) {
      setState({ data: [], source: 'demo', loading: false, error: 'Supabase not configured' })
      return
    }

    async function fetchCustomers() {
      try {
        const { data, error } = await supabase!
          .from('customers')
          .select('*')
          .order('last_active_at', { ascending: false })

        if (error) throw error

        // Fetch transaction summaries per customer
        const { data: txData } = await supabase!
          .from('transactions')
          .select('*')
          .eq('status', 'succeeded')

        const txByCustomer = new Map<string, { total: number; count: number; months: Set<string>; first: string; last: string; monthlyData: Record<string, number> }>()
        for (const tx of (txData || []) as Transaction[]) {
          const cid = tx.customer_id
          if (!cid) continue
          if (!txByCustomer.has(cid)) {
            txByCustomer.set(cid, { total: 0, count: 0, months: new Set(), first: tx.month, last: tx.month, monthlyData: {} })
          }
          const entry = txByCustomer.get(cid)!
          entry.total += tx.amount_usd
          entry.count += 1
          entry.months.add(tx.month)
          if (tx.month < entry.first) entry.first = tx.month
          if (tx.month > entry.last) entry.last = tx.month
          entry.monthlyData[tx.month] = (entry.monthlyData[tx.month] || 0) + tx.amount_usd
        }

        const mapped: DemoCustomerFull[] = (data || []).map((c: Customer) => {
          const txInfo = txByCustomer.get(c.id)
          return {
            id: c.id,
            email: c.email || '',
            company: c.company_name || '',
            contact: c.contact_name || '',
            phone: c.phone || '',
            nip: c.nip || '',
            plan: '',
            status: (c.last_active_at && c.last_active_at >= '2026-02' ? 'active' : 'churned') as 'active' | 'churned',
            source: (c.source || 'manual') as DemoCustomerFull['source'],
            firstPayment: txInfo?.first || c.first_seen_at || '',
            lastPayment: txInfo?.last || c.last_active_at || '',
            totalRevenue: txInfo?.total || 0,
            transactions: txInfo?.count || 0,
            activeMonths: txInfo?.months.size || 0,
            tags: c.tags || [],
            monthlyData: txInfo?.monthlyData || {},
          }
        })

        setState({ data: mapped, source: 'supabase', loading: false, error: null })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch'
        setState({ data: [], source: 'supabase', loading: false, error: msg })
      }
    }

    fetchCustomers()
  }, [refreshKey])

  return { ...state, refetch }
}

// ─── Products Hook ───
type ProductRow = { id: string; name: string; category: string; billing_type: string; base_price_usd: number | null; aliases: string[]; customers: number; revenue: number }

export function useProducts(): DataState<ProductRow[]> {
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey(k => k + 1), [])
  const [state, setState] = useState<Omit<DataState<ProductRow[]>, 'refetch'>>({
    data: [],
    source: 'supabase',
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!supabase) {
      setState({ data: [], source: 'demo', loading: false, error: 'Supabase not configured' })
      return
    }

    async function fetchProducts() {
      try {
        const [prodRes, aliasRes] = await Promise.all([
          supabase!.from('products').select('*').order('name'),
          supabase!.from('product_aliases').select('*'),
        ])

        if (prodRes.error) throw prodRes.error

        const aliases = (aliasRes.data || []) as ProductAlias[]
        const aliasesByProduct = new Map<string, string[]>()
        for (const a of aliases) {
          if (!aliasesByProduct.has(a.product_id)) aliasesByProduct.set(a.product_id, [])
          aliasesByProduct.get(a.product_id)!.push(a.alias)
        }

        const mapped: ProductRow[] = ((prodRes.data || []) as Product[]).map(p => ({
          id: p.id,
          name: p.display_name,
          category: p.category,
          billing_type: p.billing_type,
          base_price_usd: p.base_price_usd,
          aliases: aliasesByProduct.get(p.id) || [],
          customers: 0,
          revenue: 0,
        }))

        setState({ data: mapped, source: 'supabase', loading: false, error: null })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch'
        setState({ data: [], source: 'supabase', loading: false, error: msg })
      }
    }

    fetchProducts()
  }, [refreshKey])

  return { ...state, refetch }
}

// ─── Connection status check ───
export function useSupabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'no_tables' | 'disconnected'>('checking')

  useEffect(() => {
    if (!supabase) {
      setStatus('disconnected')
      return
    }

    async function check() {
      try {
        const { error } = await supabase!.from('products').select('id').limit(1)
        if (error) {
          if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
            setStatus('no_tables')
          } else {
            setStatus('disconnected')
          }
        } else {
          setStatus('connected')
        }
      } catch {
        setStatus('disconnected')
      }
    }

    check()
  }, [])

  return status
}
