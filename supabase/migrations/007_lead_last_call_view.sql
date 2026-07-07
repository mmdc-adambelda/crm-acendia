-- ============================================================
-- Most recent call per lead — powers "Last Call" filtering/export
-- ============================================================
CREATE OR REPLACE VIEW lead_last_calls AS
SELECT DISTINCT ON (lead_id)
  lead_id, call_outcome, call_date
FROM call_logs
WHERE lead_id IS NOT NULL
ORDER BY lead_id, call_date DESC;
