'use client'

import * as React from 'react'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SendSmsDialog } from './SendSmsDialog'

interface SendSmsButtonProps {
  toPhone: string
  toName?: string | null
  leadId?: string | null
}

export function SendSmsButton({ toPhone, toName, leadId }: SendSmsButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <MessageSquare className="h-4 w-4" />
        Send SMS
      </Button>

      <SendSmsDialog
        open={open}
        onOpenChange={setOpen}
        toPhone={toPhone}
        toName={toName}
        leadId={leadId}
      />
    </>
  )
}
