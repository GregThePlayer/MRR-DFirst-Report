-- DFIRST.AI Metrics Platform — Initial Schema
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════
-- DATA SOURCES (track imports)
-- ═══════════════════════════════════════
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- 'stripe_csv', 'invoices_2025', 'invoices_jan2026', 'taxxo'
  source_type TEXT NOT NULL,           -- 'stripe', 'invoice_xlsx', 'manual'
  description TEXT,
  last_synced_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',           -- store file paths, sheet names, column mappings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- PRODUCTS (canonical product catalog)
-- ═══════════════════════════════════════
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,            -- canonical name: "Starter Monthly", "Advanced Monthly", etc.
  display_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'subscription', -- 'subscription', 'course', 'one_time', 'enterprise'
  billing_type TEXT NOT NULL DEFAULT 'monthly',  -- 'monthly', 'annual', 'one_time'
  base_price_usd NUMERIC(10,2),
  base_price_pln NUMERIC(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- PRODUCT ALIASES (many names → 1 product)
-- ═══════════════════════════════════════
CREATE TABLE product_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alias TEXT NOT NULL UNIQUE,           -- raw name from Stripe/invoice: "STARTER [1M]", "Starter [1y]", "INNY"
  source TEXT,                          -- 'stripe', 'invoice', 'manual'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_aliases_alias ON product_aliases(alias);

-- ═══════════════════════════════════════
-- CUSTOMERS (CRM)
-- ═══════════════════════════════════════
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,                    -- primary identifier
  company_name TEXT,
  contact_name TEXT,
  phone TEXT,
  address TEXT,
  nip TEXT,                             -- Polish tax ID
  notes TEXT,
  tags TEXT[] DEFAULT '{}',             -- ['enterprise', 'agency', 'ecommerce']
  first_seen_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  source TEXT,                          -- 'stripe', 'invoice', 'manual'
  stripe_customer_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_company ON customers(company_name);

-- ═══════════════════════════════════════
-- TRANSACTIONS (unified: Stripe + invoices)
-- ═══════════════════════════════════════
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,                 -- 'stripe', 'invoice'
  source_id TEXT,                       -- original ID from source (Stripe charge ID, invoice number)
  source_row_hash TEXT,                 -- hash of raw row for dedup
  customer_id UUID REFERENCES customers(id),
  product_id UUID REFERENCES products(id),

  -- Amounts
  amount_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_pln NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',

  -- Classification
  transaction_type TEXT NOT NULL DEFAULT 'payment', -- 'payment', 'refund', 'credit_note'
  billing_type TEXT DEFAULT 'monthly',              -- 'monthly', 'annual', 'one_time'
  is_subscription BOOLEAN DEFAULT FALSE,
  is_first_payment BOOLEAN DEFAULT FALSE,

  -- Status
  status TEXT DEFAULT 'succeeded',     -- 'succeeded', 'failed', 'pending', 'refunded'

  -- Dates
  transaction_date DATE NOT NULL,
  month TEXT GENERATED ALWAYS AS (TO_CHAR(transaction_date, 'YYYY-MM')) STORED,

  -- Raw data preserved
  raw_data JSONB DEFAULT '{}',         -- original row from source

  -- Stripe-specific
  stripe_charge_id TEXT,
  stripe_subscription_value NUMERIC(10,2),
  stripe_ltv NUMERIC(10,2),
  stripe_pay_count INTEGER,

  -- Invoice-specific
  invoice_number TEXT,
  invoice_net_pln NUMERIC(10,2),
  invoice_gross_pln NUMERIC(10,2),
  invoice_tax_pln NUMERIC(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_month ON transactions(month);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_source ON transactions(source, source_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_status ON transactions(status);

-- ═══════════════════════════════════════
-- DATA OVERRIDES (user corrections that survive re-sync)
-- ═══════════════════════════════════════
CREATE TABLE data_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What we're overriding
  target_table TEXT NOT NULL,           -- 'transactions', 'customers'
  target_id UUID NOT NULL,              -- ID in target table
  field_name TEXT NOT NULL,             -- column being overridden

  -- Override values
  original_value TEXT,                  -- what the source had
  override_value TEXT,                  -- what the user set

  -- Metadata
  reason TEXT,                          -- why the override was made
  created_by TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(target_table, target_id, field_name)
);

CREATE INDEX idx_overrides_target ON data_overrides(target_table, target_id);

-- ═══════════════════════════════════════
-- GA4 / MARKETING DATA
-- ═══════════════════════════════════════
CREATE TABLE marketing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL UNIQUE,           -- '2025-09'
  ga4_users INTEGER,
  signups INTEGER,
  ad_spend_pln NUMERIC(10,2),
  ad_spend_usd NUMERIC(10,2),
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- SEED: Initial Products
-- ═══════════════════════════════════════
INSERT INTO products (name, display_name, category, billing_type, base_price_usd) VALUES
  ('starter_monthly', 'Starter Monthly', 'subscription', 'monthly', 33),
  ('advanced_monthly', 'Advanced Monthly', 'subscription', 'monthly', 83),
  ('pro_team_monthly', 'PRO / Team Monthly', 'subscription', 'monthly', 166),
  ('enterprise_monthly', 'Enterprise Monthly', 'subscription', 'monthly', 999),
  ('starter_annual', 'Starter Annual', 'subscription', 'annual', 316),
  ('advanced_annual', 'Advanced Annual', 'subscription', 'annual', 796),
  ('enterprise_custom', 'Enterprise Custom / BF Deal', 'enterprise', 'annual', NULL),
  ('vibe_marketing_academy', 'Vibe Marketing Academy', 'course', 'one_time', NULL),
  ('other', 'Other / Unknown', 'other', 'one_time', NULL);

-- Seed aliases from Stripe plan names
INSERT INTO product_aliases (product_id, alias, source) VALUES
  ((SELECT id FROM products WHERE name='starter_monthly'), 'STARTER [1M]', 'stripe'),
  ((SELECT id FROM products WHERE name='advanced_monthly'), 'Advanced [1m]', 'stripe'),
  ((SELECT id FROM products WHERE name='pro_team_monthly'), 'PRO [1M] / Team [1m]', 'stripe'),
  ((SELECT id FROM products WHERE name='enterprise_monthly'), 'ENTERPRISE [1M]', 'stripe'),
  ((SELECT id FROM products WHERE name='starter_annual'), 'STARTER [1R]', 'stripe'),
  ((SELECT id FROM products WHERE name='starter_annual'), 'Starter [1y]', 'stripe'),
  ((SELECT id FROM products WHERE name='enterprise_custom'), 'INNY', 'stripe'),
  ((SELECT id FROM products WHERE name='vibe_marketing_academy'), 'Vibe Marketing Academy - Strategia', 'stripe'),
  ((SELECT id FROM products WHERE name='vibe_marketing_academy'), 'Vibe Marketing Academy - Research', 'stripe'),
  ((SELECT id FROM products WHERE name='vibe_marketing_academy'), 'Vibe Marketing Academy - Kreacja', 'stripe'),
  ((SELECT id FROM products WHERE name='vibe_marketing_academy'), 'Vibe Marketing Academy - Cały Kurs', 'stripe'),
  ((SELECT id FROM products WHERE name='vibe_marketing_academy'), 'Vibe Marketing Academy', 'stripe');

-- Seed GA4/marketing data
INSERT INTO marketing_metrics (month, ga4_users, signups, ad_spend_pln, ad_spend_usd) VALUES
  ('2025-09', 9721, 876, 16068, 4017),
  ('2025-10', 9176, 1012, 9788, 2447),
  ('2025-11', 8765, 518, 5192, 1298),
  ('2025-12', 7577, 533, 5764, 1441),
  ('2026-01', 8191, 689, 8755, 2189),
  ('2026-02', 12507, 2349, 21260, 5315),
  ('2026-03', 4584, 757, 11057, 2764);

-- ═══════════════════════════════════════
-- HELPER: updated_at trigger
-- ═══════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_data_sources_updated BEFORE UPDATE ON data_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_marketing_updated BEFORE UPDATE ON marketing_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
