'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send, Loader2, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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

const schema = z.object({
  body: z.string().min(1, 'Message is required').max(1600, 'Message is too long'),
})
type FormValues = z.infer<typeof schema>

const SEGMENT_LENGTH = 160

interface SendSmsDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  toPhone: string
  toName?: string | null
  leadId?: string | null
  clientId?: string | null
}

export function SendSmsDialog({
  open,
  onOpenChange,
  toPhone,
  toName,
  leadId,
  clientId,
}: SendSmsDialogProps) {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { body: '' },
  })

  React.useEffect(() => {
    if (open) form.reset({ body: '' })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const bodyValue = form.watch('body')
  const segments = Math.max(1, Math.ceil(bodyValue.length / SEGMENT_LENGTH))

  async function onSubmit(values: FormValues) {
    setIsPending(true)
    const res = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId:   leadId ?? null,
        clientId: clientId ?? null,
        toPhone,
        toName:   toName ?? null,
        body:     values.body,
      }),
    })
    setIsPending(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error((data as { error?: string }).error ?? 'Failed to send SMS')
      return
    }

    toast.success('SMS sent')
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Send SMS
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">To: </span>
          <span className="font-medium">
            {toName ? `${toName} <${toPhone}>` : toPhone}
          </span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder={`Hi ${toName ?? 'there'},\n\n`}
                      autoFocus
                    />
                  </FormControl>
                  <div className="flex justify-end">
                    <p className="text-xs text-muted-foreground">
                      {bodyValue.length} chars &middot; {segments} segment{segments !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Send className="h-4 w-4" />
                }
                Send
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
