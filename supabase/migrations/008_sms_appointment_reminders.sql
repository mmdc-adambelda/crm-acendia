-- ============================================================
-- SMS appointment reminders — tracked independently of the email
-- reminder flag so a lead with no phone doesn't block email sends,
-- and vice versa.
-- ============================================================
ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS sms_reminder_sent BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_call_logs_sms_reminder_pending
  ON call_logs (appointment_at)
  WHERE appointment_at IS NOT NULL AND sms_reminder_sent = false;
