-- ============================================================
-- Acendia CRM — Seed Data (Development Only)
-- Run ONLY in local/staging — never in production
-- ============================================================

-- NOTE: Auth users must exist before profiles can be inserted.
-- In Supabase, create users via the dashboard or auth.admin API,
-- then update their profiles here.

-- ── Demo profiles (replace UUIDs with real auth.users IDs) ──
-- INSERT INTO profiles (id, email, full_name, role, phone, department) VALUES
--   ('00000000-0000-0000-0000-000000000001', 'admin@acendia.com',  'Alex Rivera',   'super_admin', '+1 555 001 0001', 'Leadership'),
--   ('00000000-0000-0000-0000-000000000002', 'bdm@acendia.com',    'Jordan Blake',  'bdm',         '+1 555 001 0002', 'Business Development'),
--   ('00000000-0000-0000-0000-000000000003', 'sales1@acendia.com', 'Morgan Chen',   'sales_rep',   '+1 555 001 0003', 'Sales'),
--   ('00000000-0000-0000-0000-000000000004', 'ops@acendia.com',    'Taylor Kim',    'operations_manager', '+1 555 001 0004', 'Operations'),
--   ('00000000-0000-0000-0000-000000000005', 'csm@acendia.com',    'Casey Patel',   'client_success_manager', '+1 555 001 0005', 'Client Success');

-- ── Demo leads (requires at least one profile row above) ─────
-- INSERT INTO leads (company_name, contact_person, email, phone, website, industry, location, source, status, deal_value, probability, lead_score, assigned_to) VALUES
--   ('Nexus Tech', 'Sarah Johnson', 'sarah@nexustech.io', '+1 555 100 1001', 'nexustech.io', 'Technology', 'San Francisco, CA', 'LinkedIn', 'New', 15000, 20, 45, '00000000-0000-0000-0000-000000000003'),
--   ('GrowthHive', 'Marcus Williams', 'marcus@growthhive.com', '+1 555 100 1002', 'growthhive.com', 'Marketing & Advertising', 'New York, NY', 'Referral', 'Contacted', 8500, 35, 55, '00000000-0000-0000-0000-000000000003'),
--   ('Summit Retail', 'Priya Kapoor', 'priya@summitretail.co', '+1 555 100 1003', 'summitretail.co', 'Retail', 'Chicago, IL', 'Cold Outreach', 'Qualified', 22000, 60, 72, '00000000-0000-0000-0000-000000000002'),
--   ('BlueSky Finance', 'Derek Thompson', 'derek@blueskyfinance.com', NULL, 'blueskyfinance.com', 'Finance', 'Austin, TX', 'Google Ads', 'Proposal Sent', 35000, 50, 68, '00000000-0000-0000-0000-000000000003'),
--   ('MedCore Health', 'Aisha Nwosu', 'aisha@medcore.health', '+1 555 100 1005', 'medcore.health', 'Healthcare', 'Boston, MA', 'Website', 'Negotiation', 45000, 75, 85, '00000000-0000-0000-0000-000000000002'),
--   ('Vertex Builders', 'Luis Reyes', 'luis@vertexbuilders.com', '+1 555 100 1006', 'vertexbuilders.com', 'Construction', 'Miami, FL', 'Event', 'Won', 28000, 100, 90, '00000000-0000-0000-0000-000000000003'),
--   ('DataStream AI', 'Nina Petrov', 'nina@datastream.ai', '+1 555 100 1007', 'datastream.ai', 'Technology', 'Seattle, WA', 'LinkedIn', 'Lost', 12000, 0, 30, '00000000-0000-0000-0000-000000000003');

SELECT 'Seed file ready. Uncomment demo data after creating auth users.' AS message;
