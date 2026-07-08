-- ============================================================
-- Editable country list (mirrors `industries`) + leads.country
-- Supports expanding into new markets (NZ, UK, AU, ...) without a deploy.
-- ============================================================
CREATE TABLE countries (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL UNIQUE,
  position   INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "countries_select_authenticated"
  ON countries FOR SELECT TO authenticated USING (true);

CREATE POLICY "countries_insert_admin"
  ON countries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY "countries_update_admin"
  ON countries FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY "countries_delete_admin"
  ON countries FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

INSERT INTO countries (name, position) VALUES
  ('New Zealand', 0),
  ('Australia', 1),
  ('United Kingdom', 2),
  ('Other', 3);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS country TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_country ON leads (country);
