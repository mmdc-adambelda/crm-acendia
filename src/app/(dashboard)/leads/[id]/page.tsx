import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Building2,
  MapPin,
  User,
  DollarSign,
  Percent,
  Star,
  Calendar,
  Clock,
  Pencil,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { StatusBadge, LeadScoreBadge } from '@/components/shared/StatusBadge'
import { ActivityTimeline } from '@/components/leads/ActivityTimeline'
import { LeadDetailActions } from '@/components/leads/LeadDetailActions'
import { LeadQuickActions } from '@/components/leads/LeadQuickActions'
import { TwilioDialer } from '@/components/leads/TwilioDialer'
import { formatCurrency, formatDate, formatRelativeTime, getInitials } from '@/lib/utils'
import type { ActivityType, LeadStatus, TaskPriority, CallOutcome } from '@/types'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('leads')
    .select('company_name')
    .eq('id', id)
    .single()
  return { title: (data as { company_name: string } | null)?.company_name ?? 'Lead Details' }
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  href?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary hover:underline truncate block"
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium">{value ?? '—'}</p>
        )}
      </div>
    </div>
  )
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Cast to any for all queries that use joins — Supabase generic collapse issue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Fetch lead first — needed for notFound check
  const leadResult: { data: Record<string, unknown> | null; error: { message: string } | null } =
    await sb
      .from('leads')
      .select('*, assignee:profiles!leads_assigned_to_fkey(id, full_name, avatar_url, role)')
      .eq('id', id)
      .single()

  if (leadResult.error || !leadResult.data) {
    notFound()
  }
  const [activitiesResult, tasksResult, callsResult, profilesResult, userResult] =
    await Promise.all([
      sb.from('activities')
        .select('id, type, description, created_at, creator:profiles!activities_created_by_fkey(full_name, avatar_url)')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })
        .limit(30),
      sb.from('tasks')
        .select('id, title, status, priority, due_date')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      sb.from('call_logs')
        .select('id, call_date, call_outcome, duration, notes')
        .eq('lead_id', id)
        .order('call_date', { ascending: false })
        .limit(10),
      supabase.from('profiles').select('id, full_name, avatar_url').eq('is_active', true).order('full_name'),
      supabase.auth.getUser(),
    ])

  type LeadFull = {
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
    assignee: { id: string; full_name: string | null; avatar_url: string | null; role: string } | null
  }

  const lead = leadResult.data as unknown as LeadFull
  const activities = ((activitiesResult as { data: unknown[] | null }).data ?? []) as {
    id: string
    type: ActivityType
    description: string
    created_at: string
    creator: { full_name: string | null; avatar_url: string | null } | null
  }[]
  type TaskRow = { id: string; title: string; status: string; priority: string; due_date: string | null }
  type CallRow = { id: string; call_date: string; call_outcome: string; duration: number | null; notes: string | null }
  const tasks = (((tasksResult as { data: unknown[] | null }).data) as TaskRow[] | null) ?? []
  const calls = (((callsResult as { data: unknown[] | null }).data) as CallRow[] | null) ?? []
  const teamMembers = (profilesResult as { data: { id: string; full_name: string | null; avatar_url: string | null }[] | null }).data ?? []
  const userId = (userResult as Awaited<ReturnType<typeof supabase.auth.getUser>>).data.user?.id ?? ''

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb + Header */}
      <div>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Leads
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{lead.company_name}</h1>
              <StatusBadge status={lead.status as LeadStatus} />
            </div>
            <p className="text-muted-foreground">{lead.contact_person}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <LeadQuickActions leadId={lead.id} leadName={lead.company_name} userId={userId} teamMembers={teamMembers} />
            <LeadDetailActions lead={lead} teamMembers={teamMembers} userId={userId} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Main info column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contact Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={Mail} label="Email" value={lead.email} href={`mailto:${lead.email}`} />
              {/* Phone — uses TwilioDialer for click-to-call when number is present */}
              {lead.phone ? (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <TwilioDialer
                      phoneNumber={lead.phone}
                      leadName={lead.company_name}
                      initialCallerIds={[
                        process.env.TWILIO_PHONE_1,
                        process.env.TWILIO_PHONE_2,
                      ].filter(Boolean) as string[]}
                    />
                  </div>
                </div>
              ) : (
                <InfoRow icon={Phone} label="Phone" value={null} />
              )}
              <InfoRow icon={Globe} label="Website" value={lead.website} href={lead.website ?? undefined} />
              <InfoRow icon={Building2} label="Industry" value={lead.industry} />
              <InfoRow icon={MapPin} label="Location" value={lead.location} />
            </CardContent>
          </Card>

          {/* Deal Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Deal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Deal Value</p>
                <p className="text-lg font-bold mt-0.5">
                  {lead.deal_value != null ? formatCurrency(lead.deal_value) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Probability</p>
                <p className="text-lg font-bold mt-0.5">
                  {lead.probability != null ? `${lead.probability}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lead Score</p>
                <div className="mt-1">
                  <LeadScoreBadge score={lead.lead_score} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Source</p>
                <p className="text-sm font-medium mt-0.5">{lead.source}</p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {lead.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{lead.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Recent Tasks */}
          {tasks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Tasks ({tasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 px-6 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Due {formatDate(task.due_date)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Calls */}
          {calls.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Call Logs ({calls.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {calls.map((call) => (
                    <div key={call.id} className="flex items-center gap-3 px-6 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={call.call_outcome as CallOutcome} />
                          <p className="text-xs text-muted-foreground">
                            {formatDate(call.call_date)}
                          </p>
                          {call.duration && (
                            <p className="text-xs text-muted-foreground">
                              {call.duration}m
                            </p>
                          )}
                        </div>
                        {call.notes && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                            {call.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Assignee */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Assigned To
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lead.assignee ? (
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={lead.assignee.avatar_url ?? undefined} />
                    <AvatarFallback className="text-sm">
                      {getInitials(lead.assignee.full_name ?? '')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{lead.assignee.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {lead.assignee.role?.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unassigned</p>
              )}
            </CardContent>
          </Card>

          {/* Meta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow
                icon={Calendar}
                label="Created"
                value={`${formatDate(lead.created_at)} (${formatRelativeTime(lead.created_at)})`}
              />
              <InfoRow
                icon={Clock}
                label="Last Updated"
                value={formatRelativeTime(lead.updated_at)}
              />
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ActivityTimeline activities={activities} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
