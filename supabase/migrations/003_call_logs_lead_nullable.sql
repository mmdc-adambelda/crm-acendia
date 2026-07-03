-- Allow call logs to exist without a linked lead (e.g. cold calls from the DialerPad)
ALTER TABLE call_logs ALTER COLUMN lead_id DROP NOT NULL;
