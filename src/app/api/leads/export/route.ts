import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type LeadExportRow = {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string | null
  website: string | null
  industry: string | null
  country: string | null
  location: string | null
  status: string
  source: string
  deal_value: number | null
  probability: number | null
  lead_score: number
  created_at: string
  assignee: { full_name: string | null } | null
}

// Prevent CSV/formula injection when the file is opened in Excel/Sheets —
// neutralize leading =, +, -, @ which those apps treat as formula triggers.
function sanitizeCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const params = req.nextUrl.searchParams
  const q = params.get('q')?.trim() ?? ''
  const status = params.get('status') ?? ''
  const source = params.get('source') ?? ''
  const assignedTo = params.get('assigned_to') ?? ''
  const lastCall = params.get('last_call') ?? ''
  const country = params.get('country') ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  let query = sb
    .from('leads')
    .select(
      `id, company_name, contact_person, email, phone, website, industry, country,
       location, status, source, deal_value, probability, lead_score, created_at,
       assignee:profiles!leads_assigned_to_fkey(full_name)`,
    )

  if (q) {
    query = query.or(`company_name.ilike.%${q}%,contact_person.ilike.%${q}%,email.ilike.%${q}%`)
  }
  if (status) query = query.eq('status', status)
  if (source) query = query.eq('source', source)
  if (country) query = query.eq('country', country)
  if (assignedTo === 'unassigned') {
    query = query.is('assigned_to', null)
  } else if (assignedTo) {
    query = query.eq('assigned_to', assignedTo)
  }

  if (lastCall === 'none') {
    const { data: calledIds } = await sb.from('lead_last_calls').select('lead_id')
    const ids = ((calledIds ?? []) as { lead_id: string }[]).map(r => r.lead_id)
    if (ids.length > 0) query = query.not('id', 'in', `(${ids.join(',')})`)
  } else if (lastCall) {
    const { data: matchingIds } = await sb
      .from('lead_last_calls')
      .select('lead_id')
      .eq('call_outcome', lastCall)
    const ids = ((matchingIds ?? []) as { lead_id: string }[]).map(r => r.lead_id)
    query = query.in('id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'])
  }

  query = query.order('created_at', { ascending: false })

  const { data: leads, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (leads ?? []) as LeadExportRow[]
  const leadIds = rows.map(l => l.id)

  const lastCallMap: Record<string, { call_outcome: string; call_date: string }> = {}
  if (leadIds.length > 0) {
    const { data: calls } = await sb
      .from('lead_last_calls')
      .select('lead_id, call_outcome, call_date')
      .in('lead_id', leadIds)
    for (const c of (calls ?? []) as { lead_id: string; call_outcome: string; call_date: string }[]) {
      lastCallMap[c.lead_id] = c
    }
  }

  const csvRows = rows.map(l => ({
    'Company Name': sanitizeCell(l.company_name),
    'Contact Person': sanitizeCell(l.contact_person),
    'Email': l.email,
    'Phone': l.phone ?? '',
    'Website': l.website ?? '',
    'Industry': l.industry ?? '',
    'Country': l.country ?? '',
    'Location': l.location ?? '',
    'Status': l.status,
    'Source': l.source,
    'Deal Value': l.deal_value ?? '',
    'Probability': l.probability ?? '',
    'Lead Score': l.lead_score,
    'Assigned To': l.assignee?.full_name ?? '',
    'Last Call Outcome': lastCallMap[l.id]?.call_outcome ?? '',
    'Last Call Date': lastCallMap[l.id]?.call_date ?? '',
    'Created At': l.created_at,
  }))

  const csv = Papa.unparse(csvRows)
  const filename = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
