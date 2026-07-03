-- Staging table for Twilio recording callbacks that arrive before the call log is submitted
CREATE TABLE IF NOT EXISTS twilio_recordings_pending (
  call_sid      TEXT        PRIMARY KEY,
  recording_sid TEXT        NOT NULL,
  recording_url TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-delete stale entries after 24 hours (safety net)
CREATE INDEX IF NOT EXISTS idx_pending_recordings_created_at
  ON twilio_recordings_pending (created_at);
