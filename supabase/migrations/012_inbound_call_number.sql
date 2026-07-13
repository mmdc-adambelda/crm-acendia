-- ============================================================
-- Assign a specific Twilio number to a team member for inbound
-- call routing — lets /api/twilio/incoming ring just that rep
-- instead of everyone, when the dialed number has an owner.
-- ============================================================
ALTER TABLE profiles ADD COLUMN inbound_call_number TEXT;
