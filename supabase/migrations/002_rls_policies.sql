-- DFIRST.AI Metrics Platform — RLS Policies
-- Allow anon key full access (internal dashboard, not public)

-- Enable RLS on all tables
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_metrics ENABLE ROW LEVEL SECURITY;

-- Allow full read/write for anon (internal dashboard)
CREATE POLICY "anon_all_data_sources" ON data_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_product_aliases" ON product_aliases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_data_overrides" ON data_overrides FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_marketing_metrics" ON marketing_metrics FOR ALL USING (true) WITH CHECK (true);
