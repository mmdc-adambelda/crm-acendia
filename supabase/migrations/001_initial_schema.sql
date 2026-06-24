-- ============================================================
-- Acendia CRM — Initial Schema Migration
-- Run in Supabase SQL Editor or via: supabase db push
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- trigram index for fuzzy search

-- ============================================================
-- CUSTOM TYPES / ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'super_admin',
  'admin',
  'bdm',
  'sales_rep',
  'operations_manager',
  'client_success_manager'
);

CREATE TYPE lead_status AS ENUM (
  'New',
  'Contacted',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost'
);

CREATE TYPE lead_source AS ENUM (
  'Website',
  'Referral',
  'Cold Outreach',
  'LinkedIn',
  'Facebook Ads',
  'Google Ads',
  'Email Campaign',
  'Event',
  'Other'
);

CREATE TYPE task_status AS ENUM (
  'Pending',
  'In Progress',
  'Done'
);

CREATE TYPE task_priority AS ENUM (
  'Low',
  'Medium',
  'High',
  'Urgent'
);

CREATE TYPE call_outcome AS ENUM (
  'No Answer',
  'Interested',
  'Not Interested',
  'Callback',
  'Booked Meeting'
);

CREATE TYPE onboarding_status AS ENUM (
  'Pending',
  'In Progress',
  'Completed'
);

CREATE TYPE activity_type AS ENUM (
  'lead_created',
  'lead_updated',
  'status_changed',
  'note_added',
  'call_logged',
  'task_created',
  'task_completed',
  'email_sent',
  'meeting_booked',
  'deal_won',
  'deal_lost',
  'client_created'
);

-- ============================================================
-- TABLES
-- ============================================================

-- ----------------------------------------------------------
-- PROFILES
-- Extends auth.users — auto-created via trigger on signup
-- ----------------------------------------------------------
CREATE TABLE profiles (
  id           UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT         NOT NULL UNIQUE,
  full_name    TEXT,
  avatar_url   TEXT,
  role         user_role    NOT NULL DEFAULT 'sales_rep',
  phone        TEXT,
  department   TEXT,
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'Extended user profiles linked to auth.users';

-- ----------------------------------------------------------
-- LEADS
-- Core sales pipeline records
-- ----------------------------------------------------------
CREATE TABLE leads (
  id             UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name   TEXT          NOT NULL,
  contact_person TEXT          NOT NULL,
  email          TEXT          NOT NULL,
  phone          TEXT,
  website        TEXT,
  industry       TEXT,
  location       TEXT,
  notes          TEXT,
  lead_score     INTEGER       NOT NULL DEFAULT 0
                               CONSTRAINT lead_score_range CHECK (lead_score BETWEEN 0 AND 100),
  source         lead_source   NOT NULL DEFAULT 'Other',
  assigned_to    UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  status         lead_status   NOT NULL DEFAULT 'New',
  deal_value     NUMERIC(12,2) CONSTRAINT deal_value_positive CHECK (deal_value IS NULL OR deal_value >= 0),
  probability    INTEGER       CONSTRAINT probability_range CHECK (probability IS NULL OR probability BETWEEN 0 AND 100),
  created_by     UUID          REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE leads IS 'Sales leads across all pipeline stages';
COMMENT ON COLUMN leads.lead_score IS 'Computed quality score 0–100';
COMMENT ON COLUMN leads.probability IS 'Estimated close probability 0–100%';
COMMENT ON COLUMN leads.deal_value IS 'Estimated deal value in USD';

-- ----------------------------------------------------------
-- CLIENTS
-- Created when a lead reaches Won status
-- ----------------------------------------------------------
CREATE TABLE clients (
  id                UUID               DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id           UUID               REFERENCES leads(id) ON DELETE SET NULL,
  company           TEXT               NOT NULL,
  contact_person    TEXT               NOT NULL,
  email             TEXT               NOT NULL,
  phone             TEXT,
  package           TEXT,
  monthly_retainer  NUMERIC(12,2)      CONSTRAINT retainer_positive CHECK (monthly_retainer IS NULL OR monthly_retainer >= 0),
  onboarding_status onboarding_status  NOT NULL DEFAULT 'Pending',
  contract_start    DATE,
  contract_end      DATE,
  assigned_to       UUID               REFERENCES profiles(id) ON DELETE SET NULL,
  notes             TEXT,
  created_by        UUID               REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ        NOT NULL DEFAULT now(),
  CONSTRAINT contract_dates_valid CHECK (
    contract_end IS NULL OR contract_start IS NULL OR contract_end >= contract_start
  )
);

COMMENT ON TABLE clients IS 'Active clients converted from Won leads';

-- ----------------------------------------------------------
-- TASKS
-- Can be linked to a lead or a client
-- ----------------------------------------------------------
CREATE TABLE tasks (
  id           UUID           DEFAULT uuid_generate_v4() PRIMARY KEY,
  title        TEXT           NOT NULL,
  description  TEXT,
  due_date     TIMESTAMPTZ,
  assigned_to  UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  lead_id      UUID           REFERENCES leads(id) ON DELETE CASCADE,
  client_id    UUID           REFERENCES clients(id) ON DELETE CASCADE,
  priority     task_priority  NOT NULL DEFAULT 'Medium',
  status       task_status    NOT NULL DEFAULT 'Pending',
  created_by   UUID           NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT task_single_parent CHECK (
    (lead_id IS NOT NULL AND client_id IS NULL) OR
    (lead_id IS NULL AND client_id IS NOT NULL) OR
    (lead_id IS NULL AND client_id IS NULL)
  )
);

COMMENT ON TABLE tasks IS 'Tasks linked to leads, clients, or standalone';

-- ----------------------------------------------------------
-- CALL LOGS
-- Outbound call tracking per lead
-- ----------------------------------------------------------
CREATE TABLE call_logs (
  id              UUID          DEFAULT uuid_generate_v4() PRIMARY KEY,
  lead_id         UUID          NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  call_date       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  call_outcome    call_outcome  NOT NULL,
  duration        INTEGER       CONSTRAINT duration_positive CHECK (duration IS NULL OR duration >= 0),
  notes           TEXT,
  follow_up_date  TIMESTAMPTZ,
  made_by         UUID          NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON TABLE call_logs IS 'Outbound sales call records per lead';
COMMENT ON COLUMN call_logs.duration IS 'Call duration in seconds';

-- ----------------------------------------------------------
-- NOTES
-- Rich-text notes per lead or client
-- ----------------------------------------------------------
CREATE TABLE notes (
  id           UUID         DEFAULT uuid_generate_v4() PRIMARY KEY,
  content      TEXT         NOT NULL,
  lead_id      UUID         REFERENCES leads(id) ON DELETE CASCADE,
  client_id    UUID         REFERENCES clients(id) ON DELETE CASCADE,
  created_by   UUID         NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT note_single_parent CHECK (
    (lead_id IS NOT NULL) != (client_id IS NOT NULL)
  )
);

COMMENT ON TABLE notes IS 'Notes attached to a lead or client (not both)';

-- ----------------------------------------------------------
-- ACTIVITIES
-- Immutable audit trail / timeline per lead or client
-- ----------------------------------------------------------
CREATE TABLE activities (
  id           UUID           DEFAULT uuid_generate_v4() PRIMARY KEY,
  type         activity_type  NOT NULL,
  description  TEXT           NOT NULL,
  lead_id      UUID           REFERENCES leads(id) ON DELETE CASCADE,
  client_id    UUID           REFERENCES clients(id) ON DELETE CASCADE,
  created_by   UUID           REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
  metadata     JSONB
);

COMMENT ON TABLE activities IS 'Immutable activity/audit log per lead or client';
COMMENT ON COLUMN activities.metadata IS 'Optional structured payload (e.g. status before/after)';

-- ============================================================
-- INDEXES
-- ============================================================

-- Profiles
CREATE INDEX idx_profiles_email       ON profiles(email);
CREATE INDEX idx_profiles_role        ON profiles(role);
CREATE INDEX idx_profiles_is_active   ON profiles(is_active);

-- Leads (heavy query targets)
CREATE INDEX idx_leads_status         ON leads(status);
CREATE INDEX idx_leads_assigned_to    ON leads(assigned_to);
CREATE INDEX idx_leads_source         ON leads(source);
CREATE INDEX idx_leads_created_by     ON leads(created_by);
CREATE INDEX idx_leads_created_at     ON leads(created_at DESC);
CREATE INDEX idx_leads_lead_score     ON leads(lead_score DESC);
CREATE INDEX idx_leads_deal_value     ON leads(deal_value DESC NULLS LAST);
-- Full-text search on company / contact
CREATE INDEX idx_leads_company_trgm   ON leads USING gin(company_name gin_trgm_ops);
CREATE INDEX idx_leads_contact_trgm   ON leads USING gin(contact_person gin_trgm_ops);
CREATE INDEX idx_leads_email_trgm     ON leads USING gin(email gin_trgm_ops);

-- Clients
CREATE INDEX idx_clients_assigned_to         ON clients(assigned_to);
CREATE INDEX idx_clients_onboarding_status   ON clients(onboarding_status);
CREATE INDEX idx_clients_lead_id             ON clients(lead_id);
CREATE INDEX idx_clients_created_at          ON clients(created_at DESC);
CREATE INDEX idx_clients_company_trgm        ON clients USING gin(company gin_trgm_ops);

-- Tasks
CREATE INDEX idx_tasks_assigned_to   ON tasks(assigned_to);
CREATE INDEX idx_tasks_status        ON tasks(status);
CREATE INDEX idx_tasks_priority      ON tasks(priority);
CREATE INDEX idx_tasks_lead_id       ON tasks(lead_id);
CREATE INDEX idx_tasks_client_id     ON tasks(client_id);
CREATE INDEX idx_tasks_due_date      ON tasks(due_date ASC NULLS LAST);
CREATE INDEX idx_tasks_created_by    ON tasks(created_by);

-- Call logs
CREATE INDEX idx_call_logs_lead_id       ON call_logs(lead_id);
CREATE INDEX idx_call_logs_made_by       ON call_logs(made_by);
CREATE INDEX idx_call_logs_call_date     ON call_logs(call_date DESC);
CREATE INDEX idx_call_logs_call_outcome  ON call_logs(call_outcome);

-- Notes
CREATE INDEX idx_notes_lead_id      ON notes(lead_id);
CREATE INDEX idx_notes_client_id    ON notes(client_id);
CREATE INDEX idx_notes_created_by   ON notes(created_by);
CREATE INDEX idx_notes_created_at   ON notes(created_at DESC);

-- Activities
CREATE INDEX idx_activities_lead_id    ON activities(lead_id);
CREATE INDEX idx_activities_client_id  ON activities(client_id);
CREATE INDEX idx_activities_type       ON activities(type);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_created_by ON activities(created_by);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at on any row modification
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Auto-log an activity entry when a lead's status changes
CREATE OR REPLACE FUNCTION handle_lead_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activities (type, description, lead_id, created_by, metadata)
    VALUES (
      'status_changed',
      format('Status changed from "%s" to "%s"', OLD.status, NEW.status),
      NEW.id,
      auth.uid(),
      jsonb_build_object('from', OLD.status, 'to', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Auto-log an activity entry when a task is marked Done
CREATE OR REPLACE FUNCTION handle_task_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Done' THEN
    INSERT INTO public.activities (type, description, lead_id, client_id, created_by, metadata)
    VALUES (
      'task_completed',
      format('Task completed: %s', NEW.title),
      NEW.lead_id,
      NEW.client_id,
      auth.uid(),
      jsonb_build_object('task_id', NEW.id, 'task_title', NEW.title)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at on profiles
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- updated_at on leads
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- updated_at on clients
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- updated_at on tasks
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- updated_at on call_logs
CREATE TRIGGER trg_call_logs_updated_at
  BEFORE UPDATE ON call_logs
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- updated_at on notes
CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Log lead status changes to activities
CREATE TRIGGER trg_lead_status_change
  AFTER UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION handle_lead_status_change();

-- Log task completions to activities
CREATE TRIGGER trg_task_completed
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION handle_task_completed();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities  ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ─────────────────────────────────────────────────

-- Any authenticated user can view all profiles (needed for assignee dropdowns)
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update only their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- Admins can insert profiles (for team invites handled server-side)
CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- ── LEADS ────────────────────────────────────────────────────

-- All authenticated users can view all leads (shared team visibility)
CREATE POLICY "leads_select_authenticated"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can create leads
CREATE POLICY "leads_insert_authenticated"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Creator, assignee, or admin/BDM can update a lead
CREATE POLICY "leads_update_own_or_admin"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'bdm', 'operations_manager')
    )
  )
  WITH CHECK (true);

-- Only admin/super_admin can permanently delete leads
CREATE POLICY "leads_delete_admin"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- ── CLIENTS ──────────────────────────────────────────────────

CREATE POLICY "clients_select_authenticated"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "clients_insert_authenticated"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "clients_update_own_or_admin"
  ON clients FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'client_success_manager', 'operations_manager')
    )
  )
  WITH CHECK (true);

CREATE POLICY "clients_delete_admin"
  ON clients FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- ── TASKS ────────────────────────────────────────────────────

CREATE POLICY "tasks_select_authenticated"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "tasks_insert_authenticated"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "tasks_update_own_or_admin"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'operations_manager')
    )
  )
  WITH CHECK (true);

CREATE POLICY "tasks_delete_own_or_admin"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- ── CALL LOGS ────────────────────────────────────────────────

CREATE POLICY "call_logs_select_authenticated"
  ON call_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "call_logs_insert_authenticated"
  ON call_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "call_logs_update_own_or_admin"
  ON call_logs FOR UPDATE
  TO authenticated
  USING (
    made_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'operations_manager')
    )
  )
  WITH CHECK (true);

CREATE POLICY "call_logs_delete_admin"
  ON call_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- ── NOTES ────────────────────────────────────────────────────

CREATE POLICY "notes_select_authenticated"
  ON notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "notes_insert_authenticated"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "notes_update_own"
  ON notes FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (true);

CREATE POLICY "notes_delete_own_or_admin"
  ON notes FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- ── ACTIVITIES ───────────────────────────────────────────────

-- Activities are readable by all authenticated users
CREATE POLICY "activities_select_authenticated"
  ON activities FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users and triggers can insert activities
CREATE POLICY "activities_insert_authenticated"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Activities are immutable — no updates or deletes (by non-admins)
CREATE POLICY "activities_delete_admin"
  ON activities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- Pipeline summary view for dashboard KPIs
CREATE VIEW pipeline_summary AS
SELECT
  status,
  COUNT(*)                    AS lead_count,
  COALESCE(SUM(deal_value), 0) AS total_value,
  AVG(lead_score)             AS avg_lead_score
FROM leads
GROUP BY status;

-- Today's call activity
CREATE VIEW todays_calls AS
SELECT
  cl.*,
  p.full_name AS caller_name,
  l.company_name,
  l.contact_person
FROM call_logs cl
JOIN profiles p ON p.id = cl.made_by
JOIN leads    l ON l.id = cl.lead_id
WHERE cl.call_date::DATE = CURRENT_DATE;

-- ============================================================
-- GRANTS (ensures views are accessible to authenticated role)
-- ============================================================
GRANT SELECT ON pipeline_summary TO authenticated;
GRANT SELECT ON todays_calls     TO authenticated;
