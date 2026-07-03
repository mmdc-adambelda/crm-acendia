'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
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

const schema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body:    z.string().min(1, 'Message is required'),
})
type FormValues = z.infer<typeof schema>

interface SendEmailDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  toEmail: string
  toName?: string | null
  leadId?: string | null
  clientId?: string | null
}

export function SendEmailDialog({
  open,
  onOpenChange,
  toEmail,
  toName,
  leadId,
  clientId,
}: SendEmailDialogProps) {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: '', body: '' },
  })

  React.useEffect(() => {
    if (open) form.reset({ subject: '', body: '' })
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: FormValues) {
    setIsPending(true)
    const res = await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId:   leadId ?? null,
        clientId: clientId ?? null,
        toEmail,
        toName:   toName ?? null,
        subject:  values.subject,
        body:     values.body,
      }),
    })
    setIsPending(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error((data as { error?: string }).error ?? 'Failed to send email')
      return
    }

    toast.success('Email sent')
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Send Email
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">To: </span>
          <span className="font-medium">
            {toName ? `${toName} <${toEmail}>` : toEmail}
          </span>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Following up on our conversation" autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={9}
                      placeholder={`Hi ${toName ?? 'there'},\n\n`}
                    />
                  </FormControl>
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
