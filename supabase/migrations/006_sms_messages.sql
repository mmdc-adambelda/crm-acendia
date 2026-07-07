-- ============================================================
-- SMS log — manual sends + automated reminders via ClickSend (mirrors `emails`)
-- ============================================================
CREATE TABLE sms_messages (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id             UUID        REFERENCES leads(id)   ON DELETE CASCADE,
  client_id           UUID        REFERENCES clients(id) ON DELETE CASCADE,
  to_phone            TEXT        NOT NULL,
  to_name             TEXT,
  body                TEXT        NOT NULL,
  sent_by             UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider_message_id TEXT,
  status              TEXT        NOT NULL DEFAULT 'sent', -- 'sent' | 'failed'
  type                TEXT        NOT NULL DEFAULT 'manual' -- 'manual' | 'reminder'
);

CREATE INDEX idx_sms_messages_lead_id   ON sms_messages (lead_id);
CREATE INDEX idx_sms_messages_client_id ON sms_messages (client_id);
CREATE INDEX idx_sms_messages_sent_at   ON sms_messages (sent_at DESC);

ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_messages_all_authenticated"
  ON sms_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
