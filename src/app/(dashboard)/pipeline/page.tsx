import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { PipelineBoard } from '@/components/pipeline/PipelineBoard'
import { LEAD_STATUSES, type LeadStatus } from '@/types'
import type { Column } from '@/components/pipeline/PipelineColumn'
import type { PipelineLead } from '@/components/pipeline/PipelineCard'

export const metadata: Metadata = { title: 'Pipeline' }
export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: rawLeads } = await sb
    .from('leads')
    .select(
      'id, company_name, contact_person, deal_value, lead_score, probability, source, status, assigned_to, assignee:profiles!leads_assigned_to_fkey(full_name, avatar_url)',
    )
    .order('created_at', { ascending: false })

  const leads = (rawLeads ?? []) as (PipelineLead & { status: string })[]

  const columns: Column[] = LEAD_STATUSES.map((status: LeadStatus) => {
    const colLeads = leads.filter((l) => l.status === status)
    return {
      id: status,
      leads: colLeads,
      totalValue: colLeads.reduce((sum, l) => sum + (l.deal_value ?? 0), 0),
    }
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Drag leads between stages to update their status
        </p>
      </div>

      <PipelineBoard initialColumns={columns} />
    </div>
  )
}
