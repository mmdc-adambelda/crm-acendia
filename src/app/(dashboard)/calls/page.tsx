import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import {
  Phone,
  PhoneOff,
  PhoneCall,
  PhoneMissed,
  CalendarClock,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CallFilters } from '@/components/calls/CallFilters'
import { CallRecordingPlayer } from '@/components/calls/CallRecordingPlayer'
import { formatDate, getInitials } from '@/lib/utils'
import { nzDayRangeUtc } from '@/lib/timezone'
import { CALL_OUTCOMES } from '@/types'
import type { CallOutcome } from '@/types'

export const metadata: Metadata = { title: 'Call Logs' }
export const dynamic = 'force-dynamic'

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  'No Answer':      { label: 'No Answer',      color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  'Interested':     { label: 'Interested',      color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  'Not Interested': { label: 'Not Interested',  color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  'Callback':       { label: 'Callback',        color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  'Booked Meeting': { label: 'Booked Meeting',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ my?: string; outcome?: string; period?: string }>
}) {
  const { my, outcome, period } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Only admins, BDMs, and managers can view the full call log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any).select('role').eq('id', user.id).single()
  if ((profile as { role?: string } | null)?.role === 'sales_rep') redirect('/leads')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  // Build date filter
  let dateFrom: string | null = null
  const now = new Date()
  if (period === 'today') {
    dateFrom = nzDayRangeUtc(0).start.toISOString()
  } else if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    dateFrom = d.toISOString()
  } else if (period === 'month') {
    const d = new Date(now)
    d.setDate(d.getDate() - 30)
    dateFrom = d.toISOString()
  }

  // Fetch call logs with lead + agent joins
  let query = sb
    .from('call_logs')
    .select(`
      id,
      call_date,
      duration,
      call_outcome,
      notes,
      follow_up_date,
      lead_id,
      recording_sid,
      lead:leads(id, company_name, contact_person),
      agent:profiles!call_logs_made_by_fkey(id, full_name)
    `)
    .order('call_date', { ascending: false })
    .limit(200)

  if (my === '1') query = query.eq('made_by', user.id)
  if (outcome && CALL_OUTCOMES.includes(outcome as CallOutcome)) query = query.eq('call_outcome', outcome)
  if (dateFrom) query = query.gte('call_date', dateFrom)

  const { data: rawLogs } = await query

  type CallLog = {
    id: string
    call_date: string
    duration: number | null
    call_outcome: string
    notes: string | null
    follow_up_date: string | null
    lead_id: string | null
    recording_sid: string | null
    lead: { id: string; company_name: string; contact_person: string } | null
    agent: { id: string; full_name: string | null } | null
  }

  const logs = (rawLogs ?? []) as CallLog[]

  // Stats
  const totalCalls = logs.length
  const interested   = logs.filter(l => l.call_outcome === 'Interested').length
  const booked       = logs.filter(l => l.call_outcome === 'Booked Meeting').length
  const noAnswer     = logs.filter(l => l.call_outcome === 'No Answer').length
  const totalMinutes = logs.reduce((sum, l) => sum + (l.duration ?? 0), 0)

  const stats = [
    { label: 'Total Calls',    value: totalCalls,   icon: Phone,        color: 'text-blue-600' },
    { label: 'Interested',     value: interested,   icon: PhoneCall,    color: 'text-green-600' },
    { label: 'Booked Meeting', value: booked,       icon: CalendarClock, color: 'text-purple-600' },
    { label: 'No Answer',      value: noAnswer,     icon: PhoneMissed,  color: 'text-slate-500' },
    { label: 'Talk Time',      value: `${totalMinutes}m`, icon: Clock,  color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Call Logs</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          All outbound calls made through Acendia CRM
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <s.icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
              </div>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <CallFilters />

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {totalCalls} call{totalCalls !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <PhoneOff className="h-10 w-10 text-muted-foreground/20" />
              <div>
                <p className="font-medium text-sm">No calls found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Calls made via the dialer will appear here
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date &amp; Time</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Follow-up</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Recording</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => {
                    const config = OUTCOME_CONFIG[log.call_outcome] ?? { label: log.call_outcome, color: 'bg-muted text-muted-foreground' }
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {formatDate(log.call_date)}
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.call_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </TableCell>

                        <TableCell>
                          {log.lead ? (
                            <Link
                              href={`/leads/${log.lead.id}`}
                              className="hover:underline font-medium text-sm"
                            >
                              {log.lead.company_name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                          {log.lead?.contact_person && (
                            <p className="text-xs text-muted-foreground">{log.lead.contact_person}</p>
                          )}
                        </TableCell>

                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
                            {config.label}
                          </span>
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {log.duration != null ? `${log.duration} min` : '—'}
                        </TableCell>

                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {log.follow_up_date ? formatDate(log.follow_up_date) : '—'}
                        </TableCell>

                        <TableCell>
                          {log.agent ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px] bg-primary/10">
                                  {getInitials(log.agent.full_name ?? '')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                                {log.agent.full_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>

                        <TableCell className="max-w-[200px]">
                          {log.notes ? (
                            <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                              {log.notes}
                            </p>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {log.recording_sid
                            ? <CallRecordingPlayer recordingSid={log.recording_sid} />
                            : <span className="text-muted-foreground text-sm">—</span>
                          }
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
