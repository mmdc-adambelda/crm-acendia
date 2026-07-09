'use client'

import * as React from 'react'
import Link from 'next/link'
import { Phone, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PostCallLogDialog } from '@/components/dialer/PostCallLogDialog'

interface SonetelDialerProps {
  phoneNumber: string
  leadId?: string
  leadName?: string
  userId: string
}

// Sonetel calls are "callback" style — there's no in-browser softphone like
// Twilio's Voice SDK. Sonetel rings the rep's own phone first; once they
// answer, it dials the lead and bridges the two calls together.
export function SonetelDialer({ phoneNumber, leadId, leadName, userId }: SonetelDialerProps) {
  const [userPhone, setUserPhone] = React.useState<string | null>(null)
  const [loadingPhone, setLoadingPhone] = React.useState(true)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [isCalling, setIsCalling] = React.useState(false)
  const [postCallOpen, setPostCallOpen] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    async function loadPhone() {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('profiles') as any).select('phone').eq('id', userId).single()
      if (!cancelled) {
        setUserPhone((data as { phone: string | null } | null)?.phone ?? null)
        setLoadingPhone(false)
      }
    }
    loadPhone()
    return () => { cancelled = true }
  }, [userId])

  async function handleCall() {
    setIsCalling(true)
    const res = await fetch('/api/sonetel/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phoneNumber }),
    })
    setIsCalling(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error((data as { error?: string }).error ?? 'Failed to start call')
      return
    }

    toast.success(`Calling your phone now — answer to connect to ${leadName ?? phoneNumber}`)
    setPostCallOpen(true)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <a href={`tel:${phoneNumber}`} className="text-sm font-medium hover:underline">
          {phoneNumber}
        </a>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-foreground hover:bg-muted"
          onClick={() => setConfirmOpen(true)}
          disabled={loadingPhone || !userPhone}
          title={`Call ${leadName ?? phoneNumber} via Sonetel (AU)`}
        >
          {loadingPhone ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Phone className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {!loadingPhone && !userPhone && (
        <p className="text-[10px] text-amber-600">
          <Link href="/settings/profile" className="underline">Add your phone number</Link> to call via Sonetel
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Call via Sonetel"
        description={`We'll call your phone (${userPhone}) first. Once you answer, we'll connect you to ${leadName ?? 'the lead'} (${phoneNumber}).`}
        confirmLabel="Call Me Now"
        onConfirm={handleCall}
        isPending={isCalling}
      />

      <PostCallLogDialog
        open={postCallOpen}
        onOpenChange={setPostCallOpen}
        leadId={leadId}
        leadName={leadName}
        userId={userId}
        durationSeconds={0}
      />
    </div>
  )
}
