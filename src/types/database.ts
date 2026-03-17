export type Database = {
  public: {
    Tables: {
      customers: {
        Row: Customer
        Insert: Partial<Customer> & Pick<Customer, never>
        Update: Partial<Customer>
        Relationships: []
      }
      products: {
        Row: Product
        Insert: Partial<Product> & Pick<Product, 'name' | 'display_name'>
        Update: Partial<Product>
        Relationships: []
      }
      product_aliases: {
        Row: ProductAlias
        Insert: Partial<ProductAlias> & Pick<ProductAlias, 'product_id' | 'alias'>
        Update: Partial<ProductAlias>
        Relationships: []
      }
      transactions: {
        Row: Transaction
        Insert: Partial<Transaction> & Pick<Transaction, 'source' | 'transaction_date'>
        Update: Partial<Omit<Transaction, 'month'>>
        Relationships: []
      }
      data_overrides: {
        Row: DataOverride
        Insert: Partial<DataOverride> & Pick<DataOverride, 'target_table' | 'target_id' | 'field_name'>
        Update: Partial<DataOverride>
        Relationships: []
      }
      data_sources: {
        Row: DataSource
        Insert: Partial<DataSource> & Pick<DataSource, 'name' | 'source_type'>
        Update: Partial<DataSource>
        Relationships: []
      }
      marketing_metrics: {
        Row: MarketingMetrics
        Insert: Partial<MarketingMetrics> & Pick<MarketingMetrics, 'month'>
        Update: Partial<MarketingMetrics>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export interface Customer {
  id: string
  email: string | null
  company_name: string | null
  contact_name: string | null
  phone: string | null
  address: string | null
  nip: string | null
  notes: string | null
  tags: string[]
  first_seen_at: string | null
  last_active_at: string | null
  source: string | null
  stripe_customer_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  name: string
  display_name: string
  category: 'subscription' | 'course' | 'one_time' | 'enterprise' | 'other'
  billing_type: 'monthly' | 'annual' | 'one_time'
  base_price_usd: number | null
  base_price_pln: number | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductAlias {
  id: string
  product_id: string
  alias: string
  source: string | null
  created_at: string
}

export interface Transaction {
  id: string
  source: string
  source_id: string | null
  source_row_hash: string | null
  customer_id: string | null
  product_id: string | null
  amount_usd: number
  amount_pln: number | null
  currency: string
  transaction_type: 'payment' | 'refund' | 'credit_note'
  billing_type: 'monthly' | 'annual' | 'one_time'
  is_subscription: boolean
  is_first_payment: boolean
  status: 'succeeded' | 'failed' | 'pending' | 'refunded'
  transaction_date: string
  month: string
  raw_data: Record<string, unknown>
  stripe_charge_id: string | null
  stripe_subscription_value: number | null
  stripe_ltv: number | null
  stripe_pay_count: number | null
  invoice_number: string | null
  invoice_net_pln: number | null
  invoice_gross_pln: number | null
  invoice_tax_pln: number | null
  created_at: string
  updated_at: string
}

export interface DataOverride {
  id: string
  target_table: string
  target_id: string
  field_name: string
  original_value: string | null
  override_value: string | null
  reason: string | null
  created_by: string
  created_at: string
}

export interface DataSource {
  id: string
  name: string
  source_type: string
  description: string | null
  last_synced_at: string | null
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface MarketingMetrics {
  id: string
  month: string
  ga4_users: number | null
  signups: number | null
  ad_spend_pln: number | null
  ad_spend_usd: number | null
  source: string
  created_at: string
  updated_at: string
}

// Computed metrics types
export interface MonthlyMetrics {
  month: string
  label: string
  revenue: number
  customers: number
  newCustomers: number
  churnedCustomers: number
  retainedCustomers: number
  churnRate: number
  retentionRate: number
  arpu: number
  beginningMrr: number
  newMrr: number
  expansionMrr: number
  reactivationMrr: number
  contractionMrr: number
  churnedMrr: number
  netNewMrr: number
  endingMrr: number
  mrrGrowth: number
  annualRevenue: number
  monthlyRevenue: number
  ltvAvg: number
  ltvMedian: number
  cac: number
  ltvCacRatio: number
  paybackMonths: number
  paymentFailureRate: number
  revenueChurnRate: number
  nrr: number
}
