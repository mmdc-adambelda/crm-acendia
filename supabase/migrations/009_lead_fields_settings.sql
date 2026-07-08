-- ============================================================
-- Editable industry list (replaces the hardcoded INDUSTRIES const)
-- ============================================================
CREATE TABLE industries (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL UNIQUE,
  position   INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE industries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "industries_select_authenticated"
  ON industries FOR SELECT TO authenticated USING (true);

CREATE POLICY "industries_insert_admin"
  ON industries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY "industries_update_admin"
  ON industries FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY "industries_delete_admin"
  ON industries FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

INSERT INTO industries (name, position) VALUES
  ('Aerospace & Defense', 0),
  ('Agriculture & Food', 1),
  ('Automotive', 2),
  ('Banking & Insurance', 3),
  ('Consulting & Professional Services', 4),
  ('Construction', 5),
  ('E-Commerce', 6),
  ('Education', 7),
  ('Energy', 8),
  ('Finance', 9),
  ('Government & Public Sector', 10),
  ('Healthcare', 11),
  ('Hospitality & Tourism', 12),
  ('Human Resources & Staffing', 13),
  ('Legal', 14),
  ('Manufacturing', 15),
  ('Marketing & Advertising', 16),
  ('Media & Entertainment', 17),
  ('Non-Profit', 18),
  ('Oil & Gas', 19),
  ('Pharmaceuticals & Biotech', 20),
  ('Real Estate', 21),
  ('Renewable Energy & Solar', 22),
  ('Retail', 23),
  ('Software & SaaS', 24),
  ('Technology', 25),
  ('Telecommunications', 26),
  ('Transportation & Logistics', 27),
  ('Utilities', 28),
  ('Other', 29);

-- ============================================================
-- Custom lead fields — admin-defined fields shown on the lead
-- form and detail page. `field_type`/`options` support future
-- types (number/dropdown/date); only 'text' is used today.
-- ============================================================
CREATE TABLE lead_custom_field_definitions (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT        NOT NULL,
  field_type TEXT        NOT NULL DEFAULT 'text',
  options    JSONB,
  position   INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lead_custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_custom_field_definitions_select_authenticated"
  ON lead_custom_field_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "lead_custom_field_definitions_insert_admin"
  ON lead_custom_field_definitions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY "lead_custom_field_definitions_update_admin"
  ON lead_custom_field_definitions FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE POLICY "lead_custom_field_definitions_delete_admin"
  ON lead_custom_field_definitions FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
  );

CREATE TABLE lead_custom_field_values (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id  UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES lead_custom_field_definitions(id) ON DELETE CASCADE,
  value    TEXT,
  UNIQUE (lead_id, field_id)
);

CREATE INDEX idx_lead_custom_field_values_lead_id ON lead_custom_field_values (lead_id);

ALTER TABLE lead_custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_custom_field_values_all_authenticated"
  ON lead_custom_field_values FOR ALL TO authenticated USING (true) WITH CHECK (true);
