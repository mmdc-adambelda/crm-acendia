# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project named **Acendia CRM**
2. Choose a strong database password and save it
3. Wait for the project to finish provisioning (~2 min)

## 2. Run the Migration

Open the **SQL Editor** in your Supabase dashboard and run the full contents of:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, enums, indexes, triggers, RLS policies, and views.

## 3. Configure Auth

In your Supabase project go to **Authentication → URL Configuration**:
- **Site URL**: `https://your-vercel-domain.vercel.app`
- **Redirect URLs**: add `https://your-vercel-domain.vercel.app/**`

## 4. Get Your API Keys

In **Project Settings → API**:

| Key | Where to put it |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| anon / public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role key | `SUPABASE_SERVICE_ROLE_KEY` |

Copy `.env.local.example` to `.env.local` and fill in those values.

## 5. Create First Admin User

1. In Supabase **Authentication → Users → Add User**, create the first user
2. In **SQL Editor**, run:

```sql
UPDATE profiles
SET role = 'super_admin'
WHERE email = 'your-admin-email@domain.com';
```

## 6. Database Schema Reference

| Table | Purpose |
|---|---|
| `profiles` | User profiles linked to `auth.users` |
| `leads` | Core sales pipeline records |
| `clients` | Active clients (converted from Won leads) |
| `tasks` | Tasks linked to leads, clients, or standalone |
| `call_logs` | Outbound call records per lead |
| `notes` | Notes per lead or client |
| `activities` | Immutable audit timeline |

### Key Views

| View | Purpose |
|---|---|
| `pipeline_summary` | Count + value grouped by lead status |
| `todays_calls` | All calls made today with caller + lead info |

## 7. Local Development (Optional)

```bash
npm install -g supabase
supabase init
supabase start
supabase db push
```
