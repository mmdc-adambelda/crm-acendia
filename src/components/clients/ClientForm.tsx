'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { OnboardingStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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

const ONBOARDING_STATUSES: OnboardingStatus[] = ['Pending', 'In Progress', 'Completed']

const clientSchema = z.object({
  company: z.string().min(1, 'Company name is required').max(255),
  contact_person: z.string().min(1, 'Contact person is required').max(255),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  phone: z.string().max(50).optional().nullable(),
  package: z.string().max(255).optional().nullable(),
  monthly_retainer: z.preprocess(
    v => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().min(0).nullable()
  ),
  onboarding_status: z.enum(ONBOARDING_STATUSES as [string, ...string[]]),
  contract_start: z.string().optional().nullable(),
  contract_end: z.string().optional().nullable(),
  lead_id: z.string().optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

type ClientFormValues = z.infer<typeof clientSchema>

export type ClientRow = {
  id: string
  company: string
  contact_person: string
  email: string
  phone: string | null
  package: string | null
  monthly_retainer: number | null
  onboarding_status: string
  contract_start: string | null
  contract_end: string | null
  lead_id: string | null
  assigned_to: string | null
  notes: string | null
}

type LeadOption = { id: string; company_name: string }
type TeamMember = { id: string; full_name: string | null }

interface ClientFormProps {
  client?: ClientRow | null
  leads: LeadOption[]
  teamMembers: TeamMember[]
  userId: string
  onSuccess: () => void
  onCancel: () => void
}

export function ClientForm({ client, leads, teamMembers, userId, onSuccess, onCancel }: ClientFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)
  const isEdit = !!client

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      company: client?.company ?? '',
      contact_person: client?.contact_person ?? '',
      email: client?.email ?? '',
      phone: client?.phone ?? '',
      package: client?.package ?? '',
      monthly_retainer: client?.monthly_retainer ?? null,
      onboarding_status: client?.onboarding_status ?? 'Pending',
      contract_start: client?.contract_start ?? '',
      contract_end: client?.contract_end ?? '',
      lead_id: client?.lead_id ?? '',
      assigned_to: client?.assigned_to ?? '',
      notes: client?.notes ?? '',
    },
  })

  async function onSubmit(values: ClientFormValues) {
    setIsPending(true)
    const supabase = createClient()

    const payload = {
      company: values.company,
      contact_person: values.contact_person,
      email: values.email,
      phone: values.phone || null,
      package: values.package || null,
      monthly_retainer: values.monthly_retainer,
      onboarding_status: values.onboarding_status as OnboardingStatus,
      contract_start: values.contract_start || null,
      contract_end: values.contract_end || null,
      lead_id: values.lead_id || null,
      assigned_to: values.assigned_to || null,
      notes: values.notes || null,
    }

    if (isEdit) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('clients') as any).update(payload).eq('id', client.id)
      if (error) { toast.error(error.message); setIsPending(false); return }
      toast.success('Client updated')
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('clients') as any).insert({ ...payload, created_by: userId })
      if (error) { toast.error(error.message); setIsPending(false); return }
      toast.success('Client created')
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
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Acme Corp" disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="contact_person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="John Smith" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="john@acme.com" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="+1 555 0100" disabled={isPending} />
                </FormControl>
              </FormItem>
            )}
          />

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="package"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="Growth Plan" disabled={isPending} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthly_retainer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Retainer ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value === '' ? null : e.target.value)}
                      placeholder="0"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="onboarding_status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Onboarding Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {ONBOARDING_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="contract_start"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Start</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} disabled={isPending} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contract_end"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract End</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} disabled={isPending} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="lead_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Lead</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
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
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ''} rows={3} placeholder="Notes about this client..." disabled={isPending} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-end gap-3 bg-background shrink-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? 'Updating…' : 'Creating…'}</>
            ) : isEdit ? 'Update Client' : 'Create Client'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
