'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { leadSchema, type LeadFormValues } from '@/lib/validations/leads'
import { LEAD_STATUSES, LEAD_SOURCES } from '@/types'
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

type TeamMember = { id: string; full_name: string | null }
type Industry = { id: string; name: string }
type Country = { id: string; name: string }
type FieldDefinition = { id: string; name: string; field_type: string }

type LeadRow = {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string | null
  website: string | null
  industry: string | null
  country: string | null
  location: string | null
  notes: string | null
  status: string
  source: string
  deal_value: number | null
  probability: number | null
  lead_score: number
  assigned_to: string | null
}

interface LeadFormProps {
  lead?: LeadRow | null
  teamMembers: TeamMember[]
  userId: string
  industries?: Industry[]
  countries?: Country[]
  customFields?: FieldDefinition[]
  customValues?: Record<string, string>
  onSuccess: () => void
  onCancel: () => void
}

export function LeadForm({
  lead,
  teamMembers,
  userId,
  industries = [],
  countries = [],
  customFields = [],
  customValues = {},
  onSuccess,
  onCancel,
}: LeadFormProps) {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)
  const [customFieldValues, setCustomFieldValues] = React.useState<Record<string, string>>(customValues)
  const isEdit = !!lead

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      company_name: lead?.company_name ?? '',
      contact_person: lead?.contact_person ?? '',
      email: lead?.email ?? '',
      phone: lead?.phone ?? '',
      website: lead?.website ?? '',
      industry: lead?.industry ?? '',
      country: lead?.country ?? '',
      location: lead?.location ?? '',
      status: (lead?.status as LeadFormValues['status']) ?? 'New',
      source: (lead?.source as LeadFormValues['source']) ?? 'Website',
      deal_value: lead?.deal_value ?? null,
      probability: lead?.probability ?? null,
      lead_score: lead?.lead_score ?? 0,
      assigned_to: lead?.assigned_to ?? '',
      notes: lead?.notes ?? '',
    },
  })

  async function onSubmit(values: LeadFormValues) {
    setIsPending(true)
    const supabase = createClient()

    // Prevent duplicate leads — check email/phone against existing leads
    // (excluding this lead itself when editing).
    const normalizedEmail = values.email.trim().toLowerCase()
    const normalizedPhone = values.phone ? values.phone.replace(/\D/g, '') : ''
    const orParts = [`email.ilike.${normalizedEmail}`]
    if (normalizedPhone) orParts.push(`phone.ilike.%${normalizedPhone}%`)
    let dupQuery = supabase.from('leads').select('id, company_name, email, phone').or(orParts.join(','))
    if (lead?.id) dupQuery = dupQuery.neq('id', lead.id)
    const { data: dupMatches } = await dupQuery
    type DupLead = { id: string; company_name: string; email: string; phone: string | null }
    const matches = (dupMatches ?? []) as DupLead[]
    const emailMatch = matches.find(m => m.email.trim().toLowerCase() === normalizedEmail)
    const phoneMatch = normalizedPhone
      ? matches.find(m => m.phone && m.phone.replace(/\D/g, '') === normalizedPhone)
      : undefined
    if (emailMatch) {
      toast.error(`A lead with this email already exists: ${emailMatch.company_name}`)
      setIsPending(false)
      return
    }
    if (phoneMatch) {
      toast.error(`A lead with this phone number already exists: ${phoneMatch.company_name}`)
      setIsPending(false)
      return
    }

    const payload = {
      company_name: values.company_name,
      contact_person: values.contact_person,
      email: values.email,
      phone: values.phone || null,
      website: values.website || null,
      industry: values.industry || null,
      country: values.country || null,
      location: values.location || null,
      notes: values.notes || null,
      status: values.status,
      source: values.source,
      deal_value: values.deal_value,
      probability: values.probability,
      lead_score: values.lead_score,
      assigned_to: values.assigned_to || null,
    }

    let leadId = lead?.id ?? null

    if (isEdit) {
      // Cast builder to any — Supabase builder types collapse with complex Database generics
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const from = supabase.from('leads') as any
      const { error } = await from.update(payload).eq('id', lead.id)
      if (error) {
        toast.error(error.message)
        setIsPending(false)
        return
      }
      toast.success('Lead updated successfully')
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const from = supabase.from('leads') as any
      const { data: created, error } = await from
        .insert({ ...payload, created_by: userId })
        .select('id')
        .single()
      if (error) {
        toast.error(error.message)
        setIsPending(false)
        return
      }
      leadId = (created as { id: string }).id
      toast.success('Lead created successfully')
    }

    // Custom field values — isolated from the core lead save so a failure
    // here doesn't roll back (or block) the lead itself.
    if (leadId && customFields.length > 0) {
      const upserts = customFields
        .filter(f => customFieldValues[f.id]?.trim())
        .map(f => ({ lead_id: leadId, field_id: f.id, value: customFieldValues[f.id].trim() }))
      const clears = customFields.filter(f => !customFieldValues[f.id]?.trim()).map(f => f.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const valuesTable = supabase.from('lead_custom_field_values') as any
      await Promise.all([
        upserts.length ? valuesTable.upsert(upserts, { onConflict: 'lead_id,field_id' }) : null,
        clears.length ? valuesTable.delete().eq('lead_id', leadId).in('field_id', clears) : null,
      ])
    }

    setIsPending(false)
    router.refresh()
    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Company */}
          <FormField
            control={form.control}
            name="company_name"
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

          {/* Contact + Email */}
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

          {/* Phone + Website */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="+1 555 0100" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="https://acme.com" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Status + Source */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LEAD_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Industry + Country */}
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {industries.map((i) => (
                        <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ''}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Location */}
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="City" disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* Deal Value + Probability + Score */}
          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="deal_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Value ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? null : e.target.value)
                      }
                      placeholder="0"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="probability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Probability (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value === '' ? null : e.target.value)
                      }
                      placeholder="0–100"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lead_score"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Score</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Assigned To */}
          <FormField
            control={form.control}
            name="assigned_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assigned To</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ''}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name ?? m.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Add notes about this lead..."
                    rows={3}
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <>
              <Separator />
              {customFields.map(field => (
                <div key={field.id} className="space-y-2">
                  <label className="text-sm font-medium leading-none">{field.name}</label>
                  <Input
                    value={customFieldValues[field.id] ?? ''}
                    onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    disabled={isPending}
                  />
                </div>
              ))}
            </>
          )}
        </div>

        {/* Fixed footer */}
        <div className="border-t px-6 py-4 flex items-center justify-end gap-3 bg-background shrink-0">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? 'Updating…' : 'Creating…'}
              </>
            ) : isEdit ? (
              'Update Lead'
            ) : (
              'Create Lead'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
