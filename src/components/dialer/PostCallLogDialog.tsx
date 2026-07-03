'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { CALL_OUTCOMES } from '@/types'
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

const schema = z.object({
  call_outcome: z.enum(CALL_OUTCOMES as [string, ...string[]], {
    required_error: 'Please select an outcome',
  }),
  notes: z.string().optional(),
  follow_up_date: z.string().optional(),
  appointment_at: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface PostCallLogDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  leadId?: string | null
  leadName?: string | null
  userId: string
  durationSeconds: number
  twilioCallSid?: string | null
  onSaved?: (callLogId: string) => void
}

export function PostCallLogDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  userId,
  durationSeconds,
  twilioCallSid,
  onSaved,
}: PostCallLogDialogProps) {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)

  const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60))

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { call_outcome: undefined, notes: '', follow_up_date: '', appointment_at: '' },
  })

  const watchOutcome = form.watch('call_outcome')

  // Reset form each time dialog opens for a new call
  React.useEffect(() => {
    if (open) form.reset({ call_outcome: undefined, notes: '', follow_up_date: '', appointment_at: '' })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: FormValues) {
    setIsPending(true)
    const supabase = createClient()

    const payload = {
      lead_id: leadId ?? null,
      made_by: userId,
      call_date: new Date().toISOString(),
      duration: durationMinutes,
      call_outcome: values.call_outcome,
      notes: values.notes?.trim() || null,
      follow_up_date: values.follow_up_date || null,
      twilio_call_sid: twilioCallSid ?? null,
      appointment_at: values.call_outcome === 'Booked Meeting' && values.appointment_at
        ? new Date(values.appointment_at).toISOString()
        : null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: savedLog, error } = await (supabase.from('call_logs') as any)
      .insert(payload)
      .select('id')
      .single()
    setIsPending(false)

    if (error) {
      toast.error(`Failed to save: ${error.message}`)
      return
    }

    toast.success('Call logged')
    onOpenChange(false)
    router.refresh()

    const logId = savedLog?.id ?? ''
    onSaved?.(logId)

    // Fire-and-forget: claim any recording that arrived before this log was submitted
    if (logId && twilioCallSid) {
      fetch('/api/twilio/claim-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callLogId: logId, callSid: twilioCallSid }),
      }).catch(() => { /* non-critical */ })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Call{leadName ? ` — ${leadName}` : ''}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Auto-filled summary */}
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 px-4 py-3">
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-medium">{durationMinutes} min</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="call_outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="How did the call go?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CALL_OUTCOMES.map(o => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="What was discussed? Key points, objections, next steps…"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="follow_up_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Follow-up Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchOutcome === 'Booked Meeting' && (
              <FormField
                control={form.control}
                name="appointment_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Appointment Date &amp; Time
                      <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                        — a 24-hour reminder will be sent to the lead
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Skip
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Log
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
