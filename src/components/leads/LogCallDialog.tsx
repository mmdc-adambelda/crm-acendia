'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { CALL_OUTCOMES, type CallOutcome } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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

const callSchema = z.object({
  call_date: z.string().min(1, 'Date is required'),
  call_outcome: z.enum(CALL_OUTCOMES as [string, ...string[]]),
  duration: z.preprocess(
    v => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().min(0).nullable()
  ),
  follow_up_date: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

type CallFormValues = z.infer<typeof callSchema>

interface LogCallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  leadName: string
  userId: string
}

export function LogCallDialog({ open, onOpenChange, leadId, leadName, userId }: LogCallDialogProps) {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)

  const today = new Date().toISOString().split('T')[0]

  const form = useForm<CallFormValues>({
    resolver: zodResolver(callSchema),
    defaultValues: {
      call_date: today,
      call_outcome: 'No Answer',
      duration: null,
      follow_up_date: null,
      notes: '',
    },
  })

  async function onSubmit(values: CallFormValues) {
    setIsPending(true)
    const supabase = createClient()

    const payload = {
      lead_id: leadId,
      call_date: values.call_date,
      call_outcome: values.call_outcome as CallOutcome,
      duration: values.duration,
      follow_up_date: values.follow_up_date || null,
      notes: values.notes || null,
      made_by: userId,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('call_logs') as any).insert(payload)

    setIsPending(false)
    if (error) { toast.error(error.message); return }

    toast.success('Call logged successfully')
    form.reset({ call_date: today, call_outcome: 'No Answer', duration: null, follow_up_date: null, notes: '' })
    router.refresh()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Log Call — {leadName}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Date + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="call_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Call Date <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
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

            {/* Outcome */}
            <FormField
              control={form.control}
              name="call_outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CALL_OUTCOMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Follow-up date */}
            <FormField
              control={form.control}
              name="follow_up_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} disabled={isPending} />
                  </FormControl>
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
                      rows={3}
                      placeholder="What was discussed..."
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Logging…</> : 'Log Call'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
