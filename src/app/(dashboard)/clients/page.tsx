import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ClientsClient } from '@/components/clients/ClientsClient'
import type { ClientRow } from '@/components/clients/ClientForm'

export const metadata: Metadata = { title: 'Clients' }
export const dynamic = 'force-dynamic'

type ClientWithRelations = ClientRow & {
  assignee: { full_name: string | null; avatar_url: string | null } | null
  lead: { id: string; company_name: string } | null
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [clientsResult, leadsResult, profilesResult] = await Promise.all([
    sb.from('clients')
      .select(
        'id, company, contact_person, email, phone, package, monthly_retainer, onboarding_status, contract_start, contract_end, lead_id, assigned_to, notes, assignee:profiles!clients_assigned_to_fkey(full_name, avatar_url), lead:leads(id, company_name)',
      )
      .order('created_at', { ascending: false }),
    sb.from('leads').select('id, company_name').order('company_name'),
    supabase.from('profiles').select('id, full_name, avatar_url').eq('is_active', true).order('full_name'),
  ])

  const clients = ((clientsResult as { data: unknown[] | null }).data ?? []) as ClientWithRelations[]
  const leads = ((leadsResult as { data: unknown[] | null }).data ?? []) as { id: string; company_name: string }[]
  const teamMembers = (profilesResult.data ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Active clients and onboarding pipeline
        </p>
      </div>

      <ClientsClient
        clients={clients}
        leads={leads}
        teamMembers={teamMembers}
        userId={userId}
      />
    </div>
  )
}
