-- Add call recording columns to call_logs
ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS twilio_call_sid TEXT,
  ADD COLUMN IF NOT EXISTS recording_sid   TEXT,
  ADD COLUMN IF NOT EXISTS recording_url   TEXT;

-- Index for fast recording-status webhook lookup by CallSid
CREATE INDEX IF NOT EXISTS idx_call_logs_twilio_call_sid
  ON call_logs (twilio_call_sid)
  WHERE twilio_call_sid IS NOT NULL;
