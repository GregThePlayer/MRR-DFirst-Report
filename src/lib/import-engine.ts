"use client"

import * as XLSX from 'xlsx'
import { supabase } from './supabase'
import type { Product, ProductAlias } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

// ─── Types ───
export interface RawRow {
  [key: string]: string | number | undefined
}

export interface ColumnMapping {
  sourceColumn: string
  targetField: string
  autoDetected: boolean
}

export interface ImportResult {
  totalRows: number
  imported: number
  skipped: number
  errors: string[]
  customersCreated: number
  customersMatched: number
  productsMatched: number
}

// Known Stripe CSV column names → target fields
const STRIPE_COLUMN_MAP: Record<string, string> = {
  'date': 'transaction_date',
  'created (utc)': 'transaction_date',
  'customer email': 'email',
  'email': 'email',
  'kwota zakupu': 'amount',
  'amount': 'amount',
  'amount refunded': 'amount_refunded',
  'charge status': 'status',
  'status': 'status',
  'plan': 'plan',
  'product': 'plan',
  'subscription plan': 'plan',
  'subskrypcja': 'is_subscription',
  'subscription': 'is_subscription',
  'czy to pierwsza płatność': 'is_first_payment',
  'is first payment': 'is_first_payment',
  'first payment': 'is_first_payment',
  'customer': 'customer_name',
  'customer name': 'customer_name',
  'company': 'company',
  'stripe charge id': 'stripe_charge_id',
  'charge id': 'stripe_charge_id',
  'id': 'stripe_charge_id',
  'subscription value': 'subscription_value',
  'wartość subskrypcji': 'subscription_value',
  'ltv': 'ltv',
  'lifetime value': 'ltv',
  'pay count': 'pay_count',
  'liczba płatności': 'pay_count',
  'currency': 'currency',
  'waluta': 'currency',
  'invoice number': 'invoice_number',
  'numer faktury': 'invoice_number',
}

// ─── Parse file to rows ───
export function parseFile(file: File): Promise<{ rows: RawRow[]; columns: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { raw: false, defval: '' })
        const columns = rows.length > 0 ? Object.keys(rows[0]) : []
        resolve({ rows, columns })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// ─── Auto-detect column mappings ───
export function autoDetectMappings(columns: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = []
  const usedTargets = new Set<string>()

  for (const col of columns) {
    const normalized = col.toLowerCase().trim()
    const target = STRIPE_COLUMN_MAP[normalized]
    if (target && !usedTargets.has(target)) {
      mappings.push({ sourceColumn: col, targetField: target, autoDetected: true })
      usedTargets.add(target)
    }
  }

  return mappings
}

// ─── Import engine ───
export interface ImportSignal {
  cancelled: boolean
}

export async function importToSupabase(
  rows: RawRow[],
  mappings: ColumnMapping[],
  sourceLabel: string,
  onProgress?: (current: number, total: number) => void,
  signal?: ImportSignal
): Promise<ImportResult> {
  if (!supabase) {
    return { totalRows: rows.length, imported: 0, skipped: rows.length, errors: ['Supabase not configured'], customersCreated: 0, customersMatched: 0, productsMatched: 0 }
  }
  // Cast to bypass strict supabase-js v2.99 generic types
  const db = supabase as AnySupabase

  const result: ImportResult = {
    totalRows: rows.length,
    imported: 0,
    skipped: 0,
    errors: [],
    customersCreated: 0,
    customersMatched: 0,
    productsMatched: 0,
  }

  // Build field lookup from mappings
  const fieldMap = new Map<string, string>()
  for (const m of mappings) {
    fieldMap.set(m.targetField, m.sourceColumn)
  }

  const getField = (row: RawRow, target: string): string => {
    const col = fieldMap.get(target)
    if (!col) return ''
    return String(row[col] ?? '').trim()
  }

  // Load products & aliases for matching
  const { data: products } = await db.from('products').select('*')
  const { data: aliases } = await db.from('product_aliases').select('*')

  const productList = (products || []) as Product[]
  const aliasList = (aliases || []) as ProductAlias[]

  const aliasToProduct = new Map<string, string>()
  for (const a of aliasList) {
    aliasToProduct.set(a.alias.toLowerCase(), a.product_id)
  }
  for (const p of productList) {
    aliasToProduct.set(p.display_name.toLowerCase(), p.id)
    aliasToProduct.set(p.name.toLowerCase(), p.id)
  }

  // Customer cache: email → id
  const customerCache = new Map<string, string>()
  const { data: existingCustomers } = await db.from('customers').select('id, email')
  for (const c of (existingCustomers || [])) {
    if (c.email) customerCache.set(c.email.toLowerCase(), c.id)
  }

  // Dedup: track source_row_hash
  const existingHashes = new Set<string>()
  const { data: existingTx } = await db.from('transactions').select('source_row_hash').not('source_row_hash', 'is', null)
  for (const t of (existingTx || [])) {
    if (t.source_row_hash) existingHashes.add(t.source_row_hash)
  }

  const matchedProductIds = new Set<string>()
  const BATCH_SIZE = 50

  for (let i = 0; i < rows.length; i++) {
    // Check for cancellation
    if (signal?.cancelled) {
      break
    }

    const row = rows[i]

    try {
      // Extract fields
      const dateStr = getField(row, 'transaction_date')
      const email = getField(row, 'email').toLowerCase()
      const amountStr = getField(row, 'amount')
      const status = getField(row, 'status').toLowerCase()
      const plan = getField(row, 'plan')
      const isSub = getField(row, 'is_subscription')
      const isFirst = getField(row, 'is_first_payment')
      const chargeId = getField(row, 'stripe_charge_id')
      const subValue = getField(row, 'subscription_value')
      const ltv = getField(row, 'ltv')
      const payCount = getField(row, 'pay_count')
      const currency = getField(row, 'currency') || 'USD'
      const company = getField(row, 'company') || getField(row, 'customer_name')

      // Validate required fields
      if (!dateStr || !amountStr) {
        result.skipped++
        continue
      }

      // Parse date
      const parsedDate = parseDate(dateStr)
      if (!parsedDate) {
        result.errors.push(`Row ${i + 1}: Invalid date "${dateStr}"`)
        result.skipped++
        continue
      }

      // Parse amount
      const amount = parseAmount(amountStr)
      if (amount === null) {
        result.errors.push(`Row ${i + 1}: Invalid amount "${amountStr}"`)
        result.skipped++
        continue
      }

      // Dedup check
      const rowHash = simpleHash(`${dateStr}|${email}|${amount}|${plan}|${chargeId}`)
      if (existingHashes.has(rowHash)) {
        result.skipped++
        continue
      }
      existingHashes.add(rowHash)

      // Match or create customer
      let customerId: string | null = null
      if (email) {
        if (customerCache.has(email)) {
          customerId = customerCache.get(email)!
          result.customersMatched++
        } else {
          const { data: newCust, error: custErr } = await db
            .from('customers')
            .insert({
              email,
              company_name: company || null,
              source: sourceLabel,
              first_seen_at: parsedDate,
              last_active_at: parsedDate,
            })
            .select('id')
            .single()

          if (custErr) {
            // Maybe race condition, try to fetch
            const { data: found } = await db.from('customers').select('id').eq('email', email).single()
            if (found) {
              customerId = found.id
              customerCache.set(email, found.id)
              result.customersMatched++
            }
          } else if (newCust) {
            customerId = newCust.id
            customerCache.set(email, newCust.id)
            result.customersCreated++
          }
        }
      }

      // Match product via alias
      let productId: string | null = null
      if (plan) {
        productId = aliasToProduct.get(plan.toLowerCase()) || null
        if (!productId) {
          // Try partial match
          for (const [alias, pid] of aliasToProduct) {
            if (plan.toLowerCase().includes(alias) || alias.includes(plan.toLowerCase())) {
              productId = pid
              break
            }
          }
        }
        if (productId) matchedProductIds.add(productId)
      }

      // Determine billing type from product or plan name
      let billingType: 'monthly' | 'annual' | 'one_time' = 'monthly'
      if (plan) {
        const planLower = plan.toLowerCase()
        if (planLower.includes('1r') || planLower.includes('1y') || planLower.includes('annual') || planLower.includes('roczn')) {
          billingType = 'annual'
        } else if (planLower.includes('academy') || planLower.includes('kurs') || planLower.includes('course')) {
          billingType = 'one_time'
        }
      }

      // Map status
      let txStatus: 'succeeded' | 'failed' | 'pending' | 'refunded' = 'succeeded'
      if (status.includes('fail')) txStatus = 'failed'
      else if (status.includes('refund')) txStatus = 'refunded'
      else if (status.includes('pend')) txStatus = 'pending'

      // Insert transaction
      const { error: txErr } = await db.from('transactions').insert({
        source: sourceLabel,
        source_id: chargeId || null,
        source_row_hash: rowHash,
        customer_id: customerId,
        product_id: productId,
        amount_usd: amount,
        currency: currency.toUpperCase(),
        transaction_type: 'payment',
        billing_type: billingType,
        is_subscription: parseBool(isSub),
        is_first_payment: parseBool(isFirst),
        status: txStatus,
        transaction_date: parsedDate,
        raw_data: row as Record<string, unknown>,
        stripe_charge_id: chargeId || null,
        stripe_subscription_value: subValue ? parseFloat(subValue) || null : null,
        stripe_ltv: ltv ? parseFloat(ltv) || null : null,
        stripe_pay_count: payCount ? parseInt(payCount) || null : null,
      })

      if (txErr) {
        result.errors.push(`Row ${i + 1}: ${txErr.message}`)
        result.skipped++
      } else {
        result.imported++
      }

      // Update customer last_active_at
      if (customerId && txStatus === 'succeeded') {
        await db
          .from('customers')
          .update({ last_active_at: parsedDate })
          .eq('id', customerId)
          .lt('last_active_at', parsedDate)
      }
    } catch (err) {
      result.errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      result.skipped++
    }

    if (onProgress && i % BATCH_SIZE === 0) {
      onProgress(i + 1, rows.length)
    }
  }

  result.productsMatched = matchedProductIds.size
  if (onProgress) onProgress(rows.length, rows.length)

  return result
}

// ─── Helpers ───
function parseDate(str: string): string | null {
  // Try ISO format: 2025-09-01
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
  // Try DD/MM/YYYY or DD.MM.YYYY
  const euMatch = str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  if (euMatch) return `${euMatch[3]}-${euMatch[2].padStart(2, '0')}-${euMatch[1].padStart(2, '0')}`
  // Try MM/DD/YYYY
  const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (usMatch) return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`
  // Try Date object parse
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

function parseAmount(str: string): number | null {
  // Remove currency symbols, spaces, and handle comma as decimal
  const cleaned = str.replace(/[^0-9.,\-]/g, '').replace(/\s/g, '')
  // Handle "1.234,56" → "1234.56"
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    if (lastComma > lastDot) {
      // European format: 1.234,56
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
    }
  }
  // Handle "1234,56" → "1234.56"
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    return parseFloat(cleaned.replace(',', '.'))
  }
  const val = parseFloat(cleaned)
  return isNaN(val) ? null : val
}

function parseBool(str: string): boolean {
  const s = str.toLowerCase()
  return s === 'true' || s === 'yes' || s === 'tak' || s === '1' || s === 'y'
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0
  }
  return `h_${Math.abs(hash).toString(36)}`
}
