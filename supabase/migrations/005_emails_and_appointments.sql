-- ============================================================
-- Email log — manual sends + automated reminders
-- ============================================================
CREATE TABLE emails (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id    UUID        REFERENCES leads(id)   ON DELETE CASCADE,
  client_id  UUID        REFERENCES clients(id) ON DELETE CASCADE,
  to_email   TEXT        NOT NULL,
  to_name    TEXT,
  subject    TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  sent_by    UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resend_id  TEXT,
  type       TEXT        NOT NULL DEFAULT 'manual' -- 'manual' | 'reminder'
);

CREATE INDEX idx_emails_lead_id   ON emails (lead_id);
CREATE INDEX idx_emails_client_id ON emails (client_id);
CREATE INDEX idx_emails_sent_at   ON emails (sent_at DESC);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emails_all_authenticated"
  ON emails FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- Appointment tracking on call_logs
-- ============================================================
ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS appointment_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_sent   BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_call_logs_appointment_at
  ON call_logs (appointment_at)
  WHERE appointment_at IS NOT NULL AND reminder_sent = false;
