-- ============================================================
-- Track inbound vs outbound calls, so outbound-only KPIs (the
-- "Outbound Call Dashboard") aren't polluted by inbound call volume.
-- ============================================================
ALTER TABLE call_logs
  ADD COLUMN direction TEXT NOT NULL DEFAULT 'outbound'
  CHECK (direction IN ('inbound', 'outbound'));
