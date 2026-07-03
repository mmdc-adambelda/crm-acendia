'use client'

import * as React from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SendEmailDialog } from './SendEmailDialog'

interface SendEmailButtonProps {
  toEmail: string
  toName?: string | null
  leadId?: string | null
}

export function SendEmailButton({ toEmail, toName, leadId }: SendEmailButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Mail className="h-4 w-4" />
        Send Email
      </Button>

      <SendEmailDialog
        open={open}
        onOpenChange={setOpen}
        toEmail={toEmail}
        toName={toName}
        leadId={leadId}
      />
    </>
  )
}
