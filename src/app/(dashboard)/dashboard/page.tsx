import type { Metadata } from 'next'
import {
  Users,
  Star,
  TrendingUp,
  Trophy,
  XCircle,
  DollarSign,
  Percent,
  Phone,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { KPICard } from '@/components/dashboard/KPICard'
import { PipelineChart } from '@/components/dashboard/PipelineChart'
import { LeadsBySourceChart } from '@/components/dashboard/LeadsBySourceChart'
import { MonthlyDealsChart } from '@/components/dashboard/MonthlyDealsChart'
import { RecentLeads } from '@/components/dashboard/RecentLeads'
import { UpcomingTasks } from '@/components/dashboard/UpcomingTasks'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

const LEAD_STAGES = [
  'New',
  'Contacted',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
] as const

export default async function DashboardPage() {
  const supabase = await createClient()

  // Today's UTC date range
  const now = new Date()
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString()
  const endOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  ).toISOString()

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  // ── Batch 1: KPI counts (≤10 for TS tuple inference) ───────────────────────
  const [
    totalResult,
    qualifiedResult,
    activeResult,
    wonResult,
    lostResult,
    pipelineValueResult,
    callsTodayResult,
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Qualified'),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .not('status', 'in', '("Won","Lost")'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Won'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Lost'),
    supabase.from('leads').select('deal_value').neq('status', 'Lost'),
    supabase
      .from('call_logs')
      .select('*', { count: 'exact', head: true })
      .gte('call_date', startOfDay)
      .lt('call_date', endOfDay),
  ])

  // ── Batch 2: Chart + table data ─────────────────────────────────────────────
  const [allLeadsResult, closedDealsResult, recentLeadsResult, upcomingTasksResult] =
    await Promise.all([
      supabase.from('leads').select('status, source, deal_value'),
      supabase
        .from('leads')
        .select('status, deal_value, updated_at')
        .in('status', ['Won', 'Lost'])
        .gte('updated_at', sixMonthsAgo.toISOString()),
      supabase
        .from('leads')
        .select('id, company_name, contact_person, status, source, deal_value, lead_score, created_at')
        .order('created_at', { ascending: false })
        .limit(6),
      supabase
        .from('tasks')
        .select('id, title, due_date, priority, status')
        .in('status', ['Pending', 'In Progress'])
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(6),
    ])

  // Explicit casts — Supabase builder types collapse to never for certain filter combos
  type LeadDealValue = { deal_value: number | null }
  type LeadChartRow = { status: string; source: string; deal_value: number | null }
  type LeadClosedRow = { status: string; deal_value: number | null; updated_at: string }

  const pipelineValues = (pipelineValueResult.data as LeadDealValue[] | null) ?? []
  const allLeads = (allLeadsResult.data as LeadChartRow[] | null) ?? []
  const closedDeals = (closedDealsResult.data as LeadClosedRow[] | null) ?? []

  // ── KPI calculations ────────────────────────────────────────────────────────
  const totalLeads = totalResult.count ?? 0
  const qualifiedLeads = qualifiedResult.count ?? 0
  const activeDeals = activeResult.count ?? 0
  const closedWon = wonResult.count ?? 0
  const closedLost = lostResult.count ?? 0

  const revenuePipeline = pipelineValues.reduce(
    (sum, lead) => sum + (lead.deal_value ?? 0),
    0,
  )

  const totalDecided = closedWon + closedLost
  const conversionRate = totalDecided > 0 ? Math.round((closedWon / totalDecided) * 100) : 0
  const callsToday = callsTodayResult.count ?? 0

  // ── Pipeline by stage ───────────────────────────────────────────────────────
  const stageMap = new Map<string, { count: number; value: number }>()
  allLeads.forEach((lead) => {
    const s = lead.status ?? 'New'
    const existing = stageMap.get(s) ?? { count: 0, value: 0 }
    existing.count++
    existing.value += lead.deal_value ?? 0
    stageMap.set(s, existing)
  })
  const pipelineChartData = LEAD_STAGES.map((stage) => ({
    stage,
    count: stageMap.get(stage)?.count ?? 0,
    value: stageMap.get(stage)?.value ?? 0,
  }))

  // ── Leads by source ─────────────────────────────────────────────────────────
  const sourceMap = new Map<string, number>()
  allLeads.forEach((lead) => {
    const src = lead.source ?? 'Other'
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1)
  })
  const leadsSourceData = Array.from(sourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  // ── Monthly closed deals ────────────────────────────────────────────────────
  const monthlyMap = new Map<string, { won: number; lost: number; value: number }>()
  closedDeals.forEach((deal) => {
    const d = new Date(deal.updated_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const existing = monthlyMap.get(key) ?? { won: 0, lost: 0, value: 0 }
    if (deal.status === 'Won') {
      existing.won++
      existing.value += deal.deal_value ?? 0
    } else {
      existing.lost++
    }
    monthlyMap.set(key, existing)
  })

  const monthlyDealsData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
    return { month: label, ...(monthlyMap.get(key) ?? { won: 0, lost: 0, value: 0 }) }
  })

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{today}</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <KPICard title="Total Leads" value={totalLeads} icon={Users} color="blue" />
        <KPICard title="Qualified Leads" value={qualifiedLeads} icon={Star} color="purple" />
        <KPICard title="Active Deals" value={activeDeals} icon={TrendingUp} color="green" />
        <KPICard title="Closed Won" value={closedWon} icon={Trophy} color="green" />
        <KPICard title="Closed Lost" value={closedLost} icon={XCircle} color="red" />
        <KPICard
          title="Revenue Pipeline"
          value={formatCurrency(revenuePipeline)}
          icon={DollarSign}
          color="green"
          description="Excl. lost leads"
        />
        <KPICard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={Percent}
          color="blue"
          description={
            totalDecided > 0
              ? `${closedWon} won / ${totalDecided} decided`
              : 'No closed deals yet'
          }
        />
        <KPICard title="Calls Today" value={callsToday} icon={Phone} color="orange" />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PipelineChart data={pipelineChartData} />
        </div>
        <LeadsBySourceChart data={leadsSourceData} />
      </div>

      {/* Monthly Trend */}
      <MonthlyDealsChart data={monthlyDealsData} />

      {/* Recent Leads + Upcoming Tasks */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <RecentLeads leads={recentLeadsResult.data ?? []} />
        <UpcomingTasks tasks={upcomingTasksResult.data ?? []} />
      </div>
    </div>
  )
}
