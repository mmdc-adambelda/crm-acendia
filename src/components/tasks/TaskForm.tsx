'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { TASK_STATUSES, TASK_PRIORITIES, type TaskStatus, type TaskPriority } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  priority: z.enum(TASK_PRIORITIES as [string, ...string[]]),
  status: z.enum(TASK_STATUSES as [string, ...string[]]),
  due_date: z.string().optional().nullable(),
  lead_id: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
})

type TaskFormValues = z.infer<typeof taskSchema>

export type TaskRow = {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string | null
  lead_id: string | null
  assigned_to: string | null
}

type LeadOption = { id: string; company_name: string }
type TeamMember = { id: string; full_name: string | null }

interface TaskFormProps {
  task?: TaskRow | null
  leads: LeadOption[]
  teamMembers: TeamMember[]
  userId: string
  defaultLeadId?: string | null
  onSuccess: () => void
  onCancel: () => void
}

export function TaskForm({
  task,
  leads,
  teamMembers,
  userId,
  defaultLeadId,
  onSuccess,
  onCancel,
}: TaskFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)
  const isEdit = !!task

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      priority: task?.priority ?? 'Medium',
      status: task?.status ?? 'Pending',
      due_date: task?.due_date ? task.due_date.split('T')[0] : '',
      lead_id: task?.lead_id ?? defaultLeadId ?? '',
      assigned_to: task?.assigned_to ?? userId,
    },
  })

  async function onSubmit(values: TaskFormValues) {
    setIsPending(true)
    const supabase = createClient()

    const payload = {
      title: values.title,
      description: values.description || null,
      priority: values.priority as TaskPriority,
      status: values.status as TaskStatus,
      due_date: values.due_date || null,
      lead_id: values.lead_id || null,
      assigned_to: values.assigned_to || null,
    }

    if (isEdit) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('tasks') as any).update(payload).eq('id', task.id)
      if (error) { toast.error(error.message); setIsPending(false); return }
      toast.success('Task updated')
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('tasks') as any).insert({ ...payload, created_by: userId })
      if (error) { toast.error(error.message); setIsPending(false); return }
      toast.success('Task created')
    }

    setIsPending(false)
    router.refresh()
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Title <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Follow up with client..." disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {TASK_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {TASK_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assigned_to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned To</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {teamMembers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="lead_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Related Lead</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isPending}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="No lead" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">No lead</SelectItem>
                    {leads.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    rows={3}
                    placeholder="Additional details..."
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-end gap-3 bg-background shrink-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? 'Updating…' : 'Creating…'}</>
            ) : isEdit ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
