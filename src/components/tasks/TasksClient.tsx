'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CheckSquare2,
  Square,
  Plus,
  Pencil,
  Trash2,
  Link2,
  MoreHorizontal,
  ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { nzDateKey, isNzToday, formatNzDate } from '@/lib/timezone'
import { TASK_STATUSES, TASK_PRIORITIES } from '@/types'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { TaskForm, type TaskRow } from './TaskForm'
import type { TaskStatus, TaskPriority } from '@/types'
import Link from 'next/link'

type LeadOption = { id: string; company_name: string }
type TeamMember = { id: string; full_name: string | null; avatar_url: string | null }

type TaskWithRelations = TaskRow & {
  lead: { id: string; company_name: string } | null
  assignee: { full_name: string | null; avatar_url: string | null } | null
}

interface TasksClientProps {
  tasks: TaskWithRelations[]
  leads: LeadOption[]
  teamMembers: TeamMember[]
  userId: string
  total: number
}

function dueDateClass(dateStr: string | null, status: string) {
  if (status === 'Done' || !dateStr) return 'text-muted-foreground'
  const dueKey = nzDateKey(dateStr)
  const todayKey = nzDateKey(new Date())
  if (dueKey < todayKey) return 'text-red-600 dark:text-red-400 font-medium'
  if (dueKey === todayKey) return 'text-orange-600 dark:text-orange-400 font-medium'
  return 'text-muted-foreground'
}

function getInitials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function TasksClient({ tasks, leads, teamMembers, userId, total }: TasksClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingTask, setEditingTask] = React.useState<TaskRow | null>(null)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [togglingId, setTogglingId] = React.useState<string | null>(null)

  const myTasks = searchParams.get('my') === '1'
  const statusFilter = searchParams.get('status') ?? ''
  const priorityFilter = searchParams.get('priority') ?? ''

  function buildURL(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    return `/tasks?${params.toString()}`
  }

  async function handleToggleDone(task: TaskWithRelations) {
    const newStatus: TaskStatus = task.status === 'Done' ? 'Pending' : 'Done'
    setTogglingId(task.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (createClient().from('tasks') as any).update({ status: newStatus }).eq('id', task.id)
    setTogglingId(null)
    if (error) { toast.error(error.message); return }
    toast.success(newStatus === 'Done' ? 'Task completed' : 'Task reopened')
    router.refresh()
  }

  async function handleDelete(id: string) {
    setIsDeleting(true)
    const { error } = await createClient().from('tasks').delete().eq('id', id)
    setIsDeleting(false)
    setDeleteId(null)
    if (error) { toast.error(error.message); return }
    toast.success('Task deleted')
    router.refresh()
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {/* My tasks / All tasks */}
          <div className="flex rounded-lg border overflow-hidden text-sm">
            <button
              onClick={() => router.push(buildURL({ my: '' }))}
              className={`px-3 py-1.5 transition-colors ${!myTasks ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              All Tasks
            </button>
            <button
              onClick={() => router.push(buildURL({ my: '1' }))}
              className={`px-3 py-1.5 transition-colors ${myTasks ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              My Tasks
            </button>
          </div>

          {/* Status filter */}
          <Select value={statusFilter || '_all'} onValueChange={v => router.push(buildURL({ status: v === '_all' ? '' : v }))}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All statuses</SelectItem>
              {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Priority filter */}
          <Select value={priorityFilter || '_all'} onValueChange={v => router.push(buildURL({ priority: v === '_all' ? '' : v }))}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All priorities</SelectItem>
              {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>

          <span className="text-sm text-muted-foreground ml-2">
            {total} task{total !== 1 ? 's' : ''}
          </span>
        </div>

        <Button
          onClick={() => { setEditingTask(null); setSheetOpen(true) }}
          className="gap-2 shrink-0"
        >
          <Plus className="h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Task list */}
      {tasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No tasks found"
          description={myTasks ? 'No tasks assigned to you' : 'Create your first task to get started'}
          action={{ label: 'New Task', onClick: () => { setEditingTask(null); setSheetOpen(true) } }}
        />
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-8 px-3 py-2.5" />
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Task</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">Lead</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground hidden sm:table-cell">Priority</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground hidden lg:table-cell">Due</th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground hidden xl:table-cell">Assignee</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.map(task => (
                <tr key={task.id} className={`group transition-colors hover:bg-muted/30 ${task.status === 'Done' ? 'opacity-60' : ''}`}>
                  {/* Checkbox */}
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => handleToggleDone(task)}
                      disabled={togglingId === task.id}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {task.status === 'Done' ? (
                        <CheckSquare2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </td>

                  {/* Title + description */}
                  <td className="px-3 py-2.5 max-w-[250px]">
                    <p className={`font-medium truncate ${task.status === 'Done' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</p>
                    )}
                  </td>

                  {/* Lead */}
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    {task.lead ? (
                      <Link
                        href={`/leads/${task.lead.id}`}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors max-w-[160px]"
                      >
                        <Link2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{task.lead.company_name}</span>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    <PriorityBadge priority={task.priority as TaskPriority} />
                  </td>

                  {/* Status */}
                  <td className="px-3 py-2.5">
                    <StatusBadge status={task.status as TaskStatus} />
                  </td>

                  {/* Due date */}
                  <td className={`px-3 py-2.5 hidden lg:table-cell text-xs ${dueDateClass(task.due_date, task.status)}`}>
                    {task.due_date
                      ? isNzToday(task.due_date)
                        ? 'Today'
                        : formatNzDate(task.due_date)
                      : <span className="text-muted-foreground/50">—</span>}
                  </td>

                  {/* Assignee */}
                  <td className="px-3 py-2.5 hidden xl:table-cell">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold overflow-hidden">
                          {task.assignee.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={task.assignee.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            getInitials(task.assignee.full_name)
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {task.assignee.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50 text-xs">Unassigned</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingTask(task); setSheetOpen(true) }}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(task.id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>{editingTask ? 'Edit Task' : 'New Task'}</SheetTitle>
          </SheetHeader>
          <TaskForm
            task={editingTask}
            leads={leads}
            teamMembers={teamMembers}
            userId={userId}
            onSuccess={() => setSheetOpen(false)}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={v => { if (!v) setDeleteId(null) }}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        variant="destructive"
        confirmLabel="Delete Task"
        onConfirm={() => { if (deleteId) handleDelete(deleteId) }}
        isPending={isDeleting}
      />
    </>
  )
}
