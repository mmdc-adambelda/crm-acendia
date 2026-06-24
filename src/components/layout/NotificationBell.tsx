'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, AlertTriangle, CalendarClock, Activity as ActivityIcon } from 'lucide-react'
import { format, isToday, isPast, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type NotifItem = {
  id: string
  kind: 'overdue' | 'due_today' | 'activity'
  title: string
  subtitle: string
  href: string
  ts: string
}

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter()
  const [notifs, setNotifs] = React.useState<NotifItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const [hasUnread, setHasUnread] = React.useState(false)
  // useRef so the realtime callback always has the latest value without re-subscribing
  const lastSeenRef = React.useRef<string>(new Date(0).toISOString())

  React.useEffect(() => {
    const stored = localStorage.getItem('notif_last_seen')
    if (stored) lastSeenRef.current = stored
  }, [])

  const fetchNotifs = React.useCallback(async () => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch overdue/due-today tasks + leads assigned to me (in parallel)
    const [tasksRes, myLeadsRes] = await Promise.all([
      sb.from('tasks')
        .select('id, title, due_date, lead_id, lead:leads(company_name)')
        .eq('assigned_to', userId)
        .neq('status', 'Done')
        .not('due_date', 'is', null)
        .lte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(10),
      sb.from('leads').select('id').eq('assigned_to', userId).limit(50),
    ])

    const items: NotifItem[] = []

    // Task notifications
    type TaskRow = {
      id: string
      title: string
      due_date: string
      lead_id: string | null
      lead: { company_name: string } | null
    }
    for (const task of (tasksRes.data ?? []) as TaskRow[]) {
      const d = parseISO(task.due_date)
      const overdue = isPast(d) && !isToday(d)
      items.push({
        id: `task-${task.id}`,
        kind: overdue ? 'overdue' : 'due_today',
        title: overdue ? `Overdue: ${task.title}` : `Due today: ${task.title}`,
        subtitle: task.lead?.company_name ?? 'No lead',
        href: task.lead_id ? `/leads/${task.lead_id}` : '/tasks',
        ts: task.due_date,
      })
    }

    // Activity notifications for leads assigned to me
    const myLeadIds = ((myLeadsRes.data ?? []) as { id: string }[]).map(l => l.id)
    if (myLeadIds.length > 0) {
      const actsRes = await sb
        .from('activities')
        .select('id, description, created_at, lead_id, lead:leads(company_name)')
        .in('lead_id', myLeadIds)
        .neq('created_by', userId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(10)

      type ActRow = {
        id: string
        description: string
        created_at: string
        lead_id: string | null
        lead: { company_name: string } | null
      }
      for (const act of (actsRes.data ?? []) as ActRow[]) {
        items.push({
          id: `act-${act.id}`,
          kind: 'activity',
          title: act.description,
          subtitle: act.lead?.company_name ?? '',
          href: act.lead_id ? `/leads/${act.lead_id}` : '/leads',
          ts: act.created_at,
        })
      }
    }

    // Sort: overdue → due_today → activity (newest first within each kind)
    items.sort((a, b) => {
      const order = { overdue: 0, due_today: 1, activity: 2 }
      if (a.kind !== b.kind) return order[a.kind] - order[b.kind]
      return b.ts.localeCompare(a.ts)
    })

    setNotifs(items)
    setLoading(false)

    // Show badge if there are overdue/due-today tasks OR new activities since last seen
    setHasUnread(
      items.some(n => n.kind === 'overdue' || n.kind === 'due_today') ||
      items.some(n => n.kind === 'activity' && n.ts > lastSeenRef.current)
    )
  }, [userId])

  // Initial fetch + real-time subscription
  React.useEffect(() => {
    fetchNotifs()

    const supabase = createClient()
    const channel = supabase
      .channel(`notifs-${userId}`)
      // New activity on any lead (we filter after fetch)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, () => {
        fetchNotifs()
      })
      // Any change to a task assigned to me
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `assigned_to=eq.${userId}`,
      }, () => {
        fetchNotifs()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchNotifs])

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (v) {
      // Mark all as seen
      const now = new Date().toISOString()
      localStorage.setItem('notif_last_seen', now)
      lastSeenRef.current = now
      setHasUnread(false)
    }
  }

  const overdueCount = notifs.filter(n => n.kind === 'overdue').length
  const dotColor = overdueCount > 0 ? 'bg-red-500' : 'bg-amber-500'

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          {hasUnread && (
            <span className={`absolute top-1.5 right-1.5 h-2 w-2 rounded-full ${dotColor} ring-2 ring-background`} />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-80 p-0 shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {notifs.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {notifs.length} item{notifs.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[360px]">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : notifs.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/20" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground">No overdue tasks or new activity on your leads</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifs.map(notif => {
                const isNewActivity = notif.kind === 'activity' && notif.ts > lastSeenRef.current
                return (
                  <Link
                    key={notif.id}
                    href={notif.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors ${
                      isNewActivity ? 'bg-primary/5' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`mt-0.5 shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                      notif.kind === 'overdue'
                        ? 'bg-red-100 dark:bg-red-950/60'
                        : notif.kind === 'due_today'
                        ? 'bg-orange-100 dark:bg-orange-950/60'
                        : 'bg-blue-100 dark:bg-blue-950/60'
                    }`}>
                      {notif.kind === 'overdue' ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      ) : notif.kind === 'due_today' ? (
                        <CalendarClock className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      ) : (
                        <ActivityIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-tight ${
                        notif.kind === 'overdue'
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : isNewActivity
                          ? 'font-medium'
                          : ''
                      }`}>
                        {notif.title}
                      </p>
                      {notif.subtitle && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {notif.subtitle}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {notif.kind === 'activity'
                          ? format(parseISO(notif.ts), 'MMM d, h:mm a')
                          : isToday(parseISO(notif.ts))
                          ? 'Due today'
                          : `Due ${format(parseISO(notif.ts), 'MMM d')}`}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {isNewActivity && (
                      <div className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-8"
            onClick={() => { setOpen(false); router.push('/tasks') }}
          >
            View all tasks
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
