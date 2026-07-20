-- ============================================================
-- Rename resend_id -> provider_message_id now that email sends
-- via the Gmail API instead of Resend (mirrors the same cleanup
-- already done for sms_messages.twilio_sid).
-- ============================================================
ALTER TABLE emails RENAME COLUMN resend_id TO provider_message_id;
