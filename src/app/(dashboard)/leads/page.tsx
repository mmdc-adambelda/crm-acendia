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
      `id, company_name, contact_person, email, phone, website, industry,
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
  if (assignedTo === 'unassigned') {
    query = query.is('assigned_to', null)
  } else if (assignedTo) {
    query = query.eq('assigned_to', assignedTo)
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
        autoOpenCreate={autoOpenCreate}
      />
    </div>
  )
}
