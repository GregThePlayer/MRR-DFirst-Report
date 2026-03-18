"use client"

import * as XLSX from 'xlsx'
import { supabase } from './supabase'
import type { Product, ProductAlias } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

// ─── Types ───
export type SourceType = 'stripe' | 'taxxo' | 'mixpanel' | 'ga4'

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

// ─── Source-specific column maps ───
const STRIPE_COLUMN_MAP: Record<string, string> = {
  'date': 'transaction_date',
  'customer email': 'email',
  'kwota zakupu': 'amount',
  'charge status': 'status',
  'plan': 'plan',
  'subskrypcja': 'is_subscription',
  'czy to pierwsza płatność (0-nie, 1 tak)': 'is_first_payment',
  'charge id': 'stripe_charge_id',
  'wartość subskrypcji': 'subscription_value',
  'ltv': 'ltv',
  'liczba udanych płatnosci klienta': 'pay_count',
  'charge currency': 'currency',
  'transaction id': 'source_id',
  'customer id': 'stripe_customer_id',
  'czy plan roczny': 'billing_period',
}

const TAXXO_COLUMN_MAP: Record<string, string> = {
  'numer faktury': 'invoice_number',
  'kontrahent': 'company',
  'adres kontrahenta': 'address',
  'data wystawienia': 'transaction_date',
  'data dostawy / usługi': 'service_date',
  'termin płatności': 'payment_due',
  'netto': 'amount',
  'łącznie podatek': 'tax_amount',
  'brutto': 'gross_amount',
  'waluta': 'currency',
  'netto w pln': 'amount_pln',
  'vat': 'vat_pln',
  'brutto w pln': 'gross_pln',
}

const MIXPANEL_COLUMN_MAP: Record<string, string> = {
  'date': 'date',
  'event': 'event_name',
  'user id': 'user_id',
  'email': 'email',
}

const GA4_COLUMN_MAP: Record<string, string> = {
  'date': 'date',
  'users': 'users',
  'sessions': 'sessions',
  'source': 'source',
}

const SOURCE_MAPS: Record<SourceType, Record<string, string>> = {
  stripe: STRIPE_COLUMN_MAP,
  taxxo: TAXXO_COLUMN_MAP,
  mixpanel: MIXPANEL_COLUMN_MAP,
  ga4: GA4_COLUMN_MAP,
}

// Target fields per source type
export const TARGET_FIELDS_BY_SOURCE: Record<SourceType, { value: string; label: string }[]> = {
  stripe: [
    { value: 'transaction_date', label: 'Transaction Date' },
    { value: 'email', label: 'Customer Email' },
    { value: 'amount', label: 'Amount' },
    { value: 'status', label: 'Status' },
    { value: 'plan', label: 'Plan / Product' },
    { value: 'is_subscription', label: 'Is Subscription' },
    { value: 'is_first_payment', label: 'Is First Payment' },
    { value: 'stripe_charge_id', label: 'Charge ID' },
    { value: 'subscription_value', label: 'Subscription Value' },
    { value: 'ltv', label: 'LTV' },
    { value: 'pay_count', label: 'Pay Count' },
    { value: 'currency', label: 'Currency' },
    { value: 'source_id', label: 'Transaction ID' },
    { value: 'stripe_customer_id', label: 'Stripe Customer ID' },
    { value: 'billing_period', label: 'Billing Period' },
    { value: '', label: '— Skip column —' },
  ],
  taxxo: [
    { value: 'transaction_date', label: 'Issue Date (Transaction Date)' },
    { value: 'invoice_number', label: 'Invoice Number' },
    { value: 'company', label: 'Company' },
    { value: 'address', label: 'Address' },
    { value: 'service_date', label: 'Service Date' },
    { value: 'payment_due', label: 'Payment Due' },
    { value: 'amount', label: 'Amount (Netto)' },
    { value: 'tax_amount', label: 'Tax Amount' },
    { value: 'gross_amount', label: 'Gross Amount' },
    { value: 'currency', label: 'Currency' },
    { value: 'amount_pln', label: 'Netto PLN' },
    { value: 'vat_pln', label: 'VAT PLN' },
    { value: 'gross_pln', label: 'Gross PLN' },
    { value: '', label: '— Skip column —' },
  ],
  mixpanel: [
    { value: 'date', label: 'Date' },
    { value: 'event_name', label: 'Event Name' },
    { value: 'user_id', label: 'User ID' },
    { value: 'email', label: 'Email' },
    { value: '', label: '— Skip column —' },
  ],
  ga4: [
    { value: 'date', label: 'Date' },
    { value: 'users', label: 'Users' },
    { value: 'sessions', label: 'Sessions' },
    { value: 'source', label: 'Source' },
    { value: '', label: '— Skip column —' },
  ],
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

// ─── Get default mappings for a source type ───
export function getDefaultMappings(sourceType: SourceType, columns: string[]): ColumnMapping[] {
  const sourceMap = SOURCE_MAPS[sourceType]
  const mappings: ColumnMapping[] = []
  const usedTargets = new Set<string>()

  for (const col of columns) {
    const normalized = col.toLowerCase().trim()
    // Exact match first
    const target = sourceMap[normalized]
    if (target && !usedTargets.has(target)) {
      mappings.push({ sourceColumn: col, targetField: target, autoDetected: true })
      usedTargets.add(target)
    }
  }

  return mappings
}

// ─── Legacy auto-detect (delegates to stripe) ───
export function autoDetectMappings(columns: string[]): ColumnMapping[] {
  return getDefaultMappings('stripe', columns)
}

// ─── Date range filter ───
export function filterRowsByDateRange(
  rows: RawRow[],
  dateColumn: string,
  startDate: string,
  endDate: string
): RawRow[] {
  return rows.filter(row => {
    const raw = String(row[dateColumn] ?? '').trim()
    const parsed = parseDate(raw)
    if (!parsed) return false
    return parsed >= startDate && parsed <= endDate
  })
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
  signal?: ImportSignal,
  sourceType: SourceType = 'stripe'
): Promise<ImportResult> {
  if (!supabase) {
    return { totalRows: rows.length, imported: 0, skipped: rows.length, errors: ['Supabase not configured'], customersCreated: 0, customersMatched: 0, productsMatched: 0 }
  }
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

  // Route based on source type
  if (sourceType === 'mixpanel' || sourceType === 'ga4') {
    return await importMarketingMetrics(rows, fieldMap, sourceLabel, sourceType, onProgress, signal, result)
  }

  if (sourceType === 'taxxo') {
    return await importTaxxo(rows, getField, fieldMap, sourceLabel, onProgress, signal, result, db)
  }

  // Default: stripe import
  return await importStripe(rows, getField, fieldMap, sourceLabel, onProgress, signal, result, db)
}

// ─── Stripe import ───
async function importStripe(
  rows: RawRow[],
  getField: (row: RawRow, target: string) => string,
  fieldMap: Map<string, string>,
  sourceLabel: string,
  onProgress: ((current: number, total: number) => void) | undefined,
  signal: ImportSignal | undefined,
  result: ImportResult,
  db: AnySupabase
): Promise<ImportResult> {
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
    if (signal?.cancelled) break

    const row = rows[i]

    try {
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
      const sourceId = getField(row, 'source_id')
      const stripeCustomerId = getField(row, 'stripe_customer_id')
      const company = getField(row, 'company') || getField(row, 'customer_name')

      if (!dateStr || !amountStr) {
        result.skipped++
        continue
      }

      const parsedDate = parseDate(dateStr)
      if (!parsedDate) {
        result.errors.push(`Row ${i + 1}: Invalid date "${dateStr}"`)
        result.skipped++
        continue
      }

      const amount = parseAmount(amountStr)
      if (amount === null) {
        result.errors.push(`Row ${i + 1}: Invalid amount "${amountStr}"`)
        result.skipped++
        continue
      }

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
              stripe_customer_id: stripeCustomerId || null,
            })
            .select('id')
            .single()

          if (custErr) {
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
          for (const [alias, pid] of aliasToProduct) {
            if (plan.toLowerCase().includes(alias) || alias.includes(plan.toLowerCase())) {
              productId = pid
              break
            }
          }
        }
        if (productId) matchedProductIds.add(productId)
      }

      // Determine billing type
      let billingType: 'monthly' | 'annual' | 'one_time' = 'monthly'
      const billingPeriod = getField(row, 'billing_period').toLowerCase()
      if (billingPeriod.includes('roczn') || billingPeriod.includes('annual') || billingPeriod.includes('1r') || billingPeriod.includes('1y')) {
        billingType = 'annual'
      } else if (plan) {
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

      const { error: txErr } = await db.from('transactions').insert({
        source: sourceLabel,
        source_id: sourceId || chargeId || null,
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
        stripe_ltv: ltv ? parseFloat(ltv.replace(/[^0-9.,\-]/g, '').replace(',', '.')) || null : null,
        stripe_pay_count: payCount ? parseInt(payCount) || null : null,
      })

      if (txErr) {
        result.errors.push(`Row ${i + 1}: ${txErr.message}`)
        result.skipped++
      } else {
        result.imported++
      }

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

// ─── Taxxo (Invoice) import ───
async function importTaxxo(
  rows: RawRow[],
  getField: (row: RawRow, target: string) => string,
  fieldMap: Map<string, string>,
  sourceLabel: string,
  onProgress: ((current: number, total: number) => void) | undefined,
  signal: ImportSignal | undefined,
  result: ImportResult,
  db: AnySupabase
): Promise<ImportResult> {
  // Customer cache: company_name → id
  const customerCache = new Map<string, string>()
  const { data: existingCustomers } = await db.from('customers').select('id, company_name')
  for (const c of (existingCustomers || [])) {
    if (c.company_name) customerCache.set(c.company_name.toLowerCase(), c.id)
  }

  // Dedup
  const existingHashes = new Set<string>()
  const { data: existingTx } = await db.from('transactions').select('source_row_hash').not('source_row_hash', 'is', null)
  for (const t of (existingTx || [])) {
    if (t.source_row_hash) existingHashes.add(t.source_row_hash)
  }

  const BATCH_SIZE = 50

  for (let i = 0; i < rows.length; i++) {
    if (signal?.cancelled) break

    const row = rows[i]

    try {
      const invoiceNumber = getField(row, 'invoice_number')
      const company = getField(row, 'company')
      const address = getField(row, 'address')
      const dateStr = getField(row, 'transaction_date')
      const serviceDate = getField(row, 'service_date')
      const paymentDue = getField(row, 'payment_due')
      const amountStr = getField(row, 'amount')
      const taxAmountStr = getField(row, 'tax_amount')
      const grossAmountStr = getField(row, 'gross_amount')
      const currency = getField(row, 'currency') || 'USD'
      const amountPlnStr = getField(row, 'amount_pln')
      const vatPlnStr = getField(row, 'vat_pln')
      const grossPlnStr = getField(row, 'gross_pln')

      if (!dateStr || !amountStr) {
        result.skipped++
        continue
      }

      const parsedDate = parseDate(dateStr)
      if (!parsedDate) {
        result.errors.push(`Row ${i + 1}: Invalid date "${dateStr}"`)
        result.skipped++
        continue
      }

      const amount = parseAmount(amountStr)
      if (amount === null) {
        result.errors.push(`Row ${i + 1}: Invalid amount "${amountStr}"`)
        result.skipped++
        continue
      }

      const rowHash = simpleHash(`${invoiceNumber}|${company}|${amount}|${dateStr}`)
      if (existingHashes.has(rowHash)) {
        result.skipped++
        continue
      }
      existingHashes.add(rowHash)

      // Detect credit notes: FV/K prefix or negative amount = refund
      const isCreditNote = invoiceNumber.toUpperCase().startsWith('FV/K') || amount < 0
      const txType: 'payment' | 'refund' | 'credit_note' = isCreditNote ? 'credit_note' : 'payment'
      const txStatus: 'succeeded' | 'failed' | 'pending' | 'refunded' = isCreditNote ? 'refunded' : 'succeeded'

      // Match or create customer by company name
      let customerId: string | null = null
      if (company) {
        const companyLower = company.toLowerCase()
        if (customerCache.has(companyLower)) {
          customerId = customerCache.get(companyLower)!
          result.customersMatched++
        } else {
          const { data: newCust, error: custErr } = await db
            .from('customers')
            .insert({
              company_name: company,
              address: address || null,
              source: sourceLabel,
              first_seen_at: parsedDate,
              last_active_at: parsedDate,
            })
            .select('id')
            .single()

          if (custErr) {
            const { data: found } = await db.from('customers').select('id').eq('company_name', company).single()
            if (found) {
              customerId = found.id
              customerCache.set(companyLower, found.id)
              result.customersMatched++
            }
          } else if (newCust) {
            customerId = newCust.id
            customerCache.set(companyLower, newCust.id)
            result.customersCreated++
          }
        }
      }

      // Parse PLN amounts
      const amountPln = parseAmount(amountPlnStr)
      const vatPln = parseAmount(vatPlnStr)
      const grossPln = parseAmount(grossPlnStr)

      const { error: txErr } = await db.from('transactions').insert({
        source: sourceLabel,
        source_id: invoiceNumber || null,
        source_row_hash: rowHash,
        customer_id: customerId,
        product_id: null,
        amount_usd: Math.abs(amount),
        amount_pln: amountPln !== null ? Math.abs(amountPln) : null,
        currency: currency.toUpperCase(),
        transaction_type: txType,
        billing_type: 'one_time' as const,
        is_subscription: false,
        is_first_payment: false,
        status: txStatus,
        transaction_date: parsedDate,
        raw_data: row as Record<string, unknown>,
        invoice_number: invoiceNumber || null,
        invoice_net_pln: amountPln,
        invoice_gross_pln: grossPln,
        invoice_tax_pln: vatPln,
      })

      if (txErr) {
        result.errors.push(`Row ${i + 1}: ${txErr.message}`)
        result.skipped++
      } else {
        result.imported++
      }

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

  if (onProgress) onProgress(rows.length, rows.length)
  return result
}

// ─── Marketing metrics import (Mixpanel / GA4 placeholder) ───
async function importMarketingMetrics(
  rows: RawRow[],
  fieldMap: Map<string, string>,
  sourceLabel: string,
  sourceType: SourceType,
  onProgress: ((current: number, total: number) => void) | undefined,
  signal: ImportSignal | undefined,
  result: ImportResult
): Promise<ImportResult> {
  // Placeholder: count rows as imported for now
  for (let i = 0; i < rows.length; i++) {
    if (signal?.cancelled) break
    // Future: insert into marketing_metrics table
    result.imported++
    if (onProgress && i % 50 === 0) {
      onProgress(i + 1, rows.length)
    }
  }
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
  if (!str) return null
  const cleaned = str.replace(/[^0-9.,\-]/g, '').replace(/\s/g, '')
  if (!cleaned) return null
  if (cleaned.includes(',') && cleaned.includes('.')) {
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    if (lastComma > lastDot) {
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
    }
  }
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
