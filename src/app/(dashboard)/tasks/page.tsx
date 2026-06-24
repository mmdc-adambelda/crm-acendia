import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { TasksClient } from '@/components/tasks/TasksClient'

export const metadata: Metadata = { title: 'Tasks' }
export const dynamic = 'force-dynamic'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; my?: string }>
}) {
  const { status, priority, my: myTasks } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  let query = sb
    .from('tasks')
    .select(
      'id, title, description, priority, status, due_date, lead_id, assigned_to, lead:leads(id, company_name), assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_url)',
    )
    .order('due_date', { ascending: true, nullsFirst: false })

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (myTasks === '1') query = query.eq('assigned_to', userId)

  const [tasksResult, leadsResult, profilesResult] = await Promise.all([
    query,
    sb.from('leads').select('id, company_name').order('company_name'),
    supabase.from('profiles').select('id, full_name, avatar_url').eq('is_active', true).order('full_name'),
  ])

  type TaskRow = {
    id: string
    title: string
    description: string | null
    priority: string
    status: string
    due_date: string | null
    lead_id: string | null
    assigned_to: string | null
    lead: { id: string; company_name: string } | null
    assignee: { full_name: string | null; avatar_url: string | null } | null
  }

  const tasks = ((tasksResult as { data: unknown[] | null }).data ?? []) as TaskRow[]
  const leads = ((leadsResult as { data: unknown[] | null }).data ?? []) as { id: string; company_name: string }[]
  const teamMembers = (profilesResult.data ?? []) as { id: string; full_name: string | null; avatar_url: string | null }[]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage and track all tasks across your leads and clients
        </p>
      </div>

      <TasksClient
        tasks={tasks}
        leads={leads}
        teamMembers={teamMembers}
        userId={userId}
        total={tasks.length}
      />
    </div>
  )
}
