'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  company_name: z.string().min(1, 'Company name is required'),
  contact_person: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface CreateLeadFromCallDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  phoneNumber?: string | null
  callLogId?: string | null
  userId: string
}

export function CreateLeadFromCallDialog({
  open,
  onOpenChange,
  phoneNumber,
  callLogId,
  userId,
}: CreateLeadFromCallDialogProps) {
  const router = useRouter()
  const [isPending, setIsPending] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { company_name: '', contact_person: '', email: '', phone: phoneNumber ?? '' },
  })

  React.useEffect(() => {
    if (open) {
      form.reset({ company_name: '', contact_person: '', email: '', phone: phoneNumber ?? '' })
    }
  }, [open, phoneNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(values: FormValues) {
    setIsPending(true)
    const supabase = createClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lead, error: leadError } = await (supabase.from('leads') as any)
      .insert({
        company_name: values.company_name.trim(),
        contact_person: values.contact_person?.trim() || '',
        email: values.email?.trim() || '',
        phone: values.phone?.trim() || null,
        status: 'New',
        source: 'Cold Call',
        lead_score: 50,
        created_by: userId,
      })
      .select('id')
      .single()

    if (leadError) {
      toast.error(`Failed to create lead: ${leadError.message}`)
      setIsPending(false)
      return
    }

    // Link the previously logged call to the new lead
    if (callLogId && lead?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('call_logs') as any)
        .update({ lead_id: lead.id })
        .eq('id', callLogId)
    }

    setIsPending(false)
    toast.success('Lead created and call linked')
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Create Lead
          </DialogTitle>
          <DialogDescription>
            No lead was attached to this call. Create one now to keep your pipeline up to date.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="company_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Acme Ltd" autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Jane Smith" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+64 9 000 0000" />
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="jane@acme.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                Create Lead
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
