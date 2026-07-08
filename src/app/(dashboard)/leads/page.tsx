import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LeadsClient } from '@/components/leads/LeadsClient'

export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'

type SearchParams = Promise<{
  q?: string
  status?: string
  source?: string
  assigned_to?: string
  last_call?: string
  country?: string
  sort?: string
  order?: string
  page?: string
  per_page?: string
  new?: string
}>

type LeadWithAssignee = {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string | null
  website: string | null
  industry: string | null
  country: string | null
  location: string | null
  notes: string | null
  status: string
  source: string
  deal_value: number | null
  probability: number | null
  lead_score: number
  assigned_to: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  assignee: { id: string; full_name: string | null; avatar_url: string | null } | null
}

export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()

  const q = params.q?.trim() ?? ''
  const status = params.status ?? ''
  const source = params.source ?? ''
  const assignedTo = params.assigned_to ?? ''
  const lastCall = params.last_call ?? ''
  const country = params.country ?? ''
  const sort = params.sort ?? 'created_at'
  const order = (params.order ?? 'desc') as 'asc' | 'desc'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const perPage = Math.min(100, parseInt(params.per_page ?? '20', 10))
  const autoOpenCreate = params.new === '1'

  const from = (page - 1) * perPage
  const to = from + perPage - 1

  // Build query
  let query = supabase
    .from('leads')
    .select(
      `id, company_name, contact_person, email, phone, website, industry, country,
       location, notes, status, source, deal_value, probability, lead_score,
       assigned_to, created_by, created_at, updated_at,
       assignee:profiles!leads_assigned_to_fkey(id, full_name, avatar_url)`,
      { count: 'exact' },
    )

  if (q) {
    query = query.or(
      `company_name.ilike.%${q}%,contact_person.ilike.%${q}%,email.ilike.%${q}%`,
    )
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: calledIds } = await (supabase as any).from('lead_last_calls').select('lead_id')
    const ids = ((calledIds ?? []) as { lead_id: string }[]).map(r => r.lead_id)
    if (ids.length > 0) query = query.not('id', 'in', `(${ids.join(',')})`)
  } else if (lastCall) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: matchingIds } = await (supabase as any)
      .from('lead_last_calls')
      .select('lead_id')
      .eq('call_outcome', lastCall)
    const ids = ((matchingIds ?? []) as { lead_id: string }[]).map(r => r.lead_id)
    query = query.in('id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'])
  }

  query = query.order(sort, { ascending: order === 'asc' }).range(from, to)

  // Team members for filters + form
  const [leadsResult, profilesResult, userResult] = await Promise.all([
    query,
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('is_active', true)
      .order('full_name'),
    supabase.auth.getUser(),
  ])

  const leads = (leadsResult.data as LeadWithAssignee[] | null) ?? []
  const total = leadsResult.count ?? 0
  const teamMembers = profilesResult.data ?? []
  const userId = userResult.data.user?.id ?? ''

  // Industries/countries + custom fields — kept separate so a missing
  // migration (009/010) doesn't crash the whole page
  type ListItem = { id: string; name: string }
  type FieldDefinition = { id: string; name: string; field_type: string }
  let industries: ListItem[] = []
  let countries: ListItem[] = []
  let customFields: FieldDefinition[] = []
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [industriesResult, countriesResult, fieldsResult] = await Promise.all([
      sb.from('industries').select('id, name').order('position'),
      sb.from('countries').select('id, name').order('position'),
      sb.from('lead_custom_field_definitions').select('id, name, field_type').order('position'),
    ])
    industries = industriesResult.data ?? []
    countries = countriesResult.data ?? []
    customFields = fieldsResult.data ?? []
  } catch {
    // tables may not exist yet
  }

  // Fetch most recent call log for each lead on this page
  const leadIds = leads.map(l => l.id)
  type LastCall = { lead_id: string; call_outcome: string; call_date: string }
  let lastCallMap: Record<string, LastCall> = {}

  if (leadIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: callLogs } = await (supabase as any)
      .from('call_logs')
      .select('lead_id, call_outcome, call_date')
      .in('lead_id', leadIds)
      .order('call_date', { ascending: false })

    if (callLogs) {
      for (const log of callLogs as LastCall[]) {
        if (log.lead_id && !lastCallMap[log.lead_id]) {
          lastCallMap[log.lead_id] = log
        }
      }
    }
  }

  // Custom field values for the leads on this page, keyed by lead id
  let customValuesMap: Record<string, Record<string, string>> = {}
  if (leadIds.length > 0 && customFields.length > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: values } = await (supabase as any)
        .from('lead_custom_field_values')
        .select('lead_id, field_id, value')
        .in('lead_id', leadIds)

      for (const v of (values ?? []) as { lead_id: string; field_id: string; value: string | null }[]) {
        if (!customValuesMap[v.lead_id]) customValuesMap[v.lead_id] = {}
        customValuesMap[v.lead_id][v.field_id] = v.value ?? ''
      }
    } catch {
      // table may not exist yet
    }
  }

  const callerIds = [
    process.env.TWILIO_PHONE_1,
    process.env.TWILIO_PHONE_2,
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-5">
      <LeadsClient
        leads={leads}
        total={total}
        page={page}
        perPage={perPage}
        sort={sort}
        order={order}
        teamMembers={teamMembers}
        userId={userId}
        initialCallerIds={callerIds}
        lastCallMap={lastCallMap}
        autoOpenCreate={autoOpenCreate}
        industries={industries}
        countries={countries}
        customFields={customFields}
        customValuesMap={customValuesMap}
      />
    </div>
  )
}
