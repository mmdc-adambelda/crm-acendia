'use client'

import * as React from 'react'
import { Phone, PhoneOff, Mic, MicOff, Loader2, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PostCallLogDialog } from '@/components/dialer/PostCallLogDialog'

type CallStatus = 'idle' | 'loading' | 'ready' | 'connecting' | 'in-call' | 'ended'

interface TwilioDialerProps {
  phoneNumber: string
  leadId?: string
  leadName?: string
  userId: string
  /** Passed from the server so the picker is visible before the first click */
  initialCallerIds?: string[]
}

export function TwilioDialer({ phoneNumber, leadId, leadName, userId, initialCallerIds = [] }: TwilioDialerProps) {
  const [status, setStatus] = React.useState<CallStatus>('idle')
  const [isMuted, setIsMuted] = React.useState(false)
  const [seconds, setSeconds] = React.useState(0)
  const [callerIds, setCallerIds] = React.useState<string[]>(initialCallerIds)
  const [selectedCallerId, setSelectedCallerId] = React.useState(initialCallerIds[0] ?? '')
  const [postCallOpen, setPostCallOpen] = React.useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceRef = React.useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callRef = React.useRef<any>(null)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (deviceRef.current) {
        try { deviceRef.current.destroy() } catch { /* ignore */ }
      }
    }
  }, [])

  async function getOrCreateDevice() {
    if (deviceRef.current) return deviceRef.current as NonNullable<typeof deviceRef.current>

    setStatus('loading')

    let tokenData: { token: string; callerIds: string[] }
    try {
      const res = await fetch('/api/twilio/token', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Failed to get call token')
      }
      tokenData = await res.json()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not initialize dialer')
      setStatus('idle')
      return null
    }

    const { token, callerIds: ids } = tokenData
    if (ids?.length) {
      setCallerIds(ids)
      setSelectedCallerId(prev => prev || ids[0])
    }

    try {
      const { Device } = await import('@twilio/voice-sdk')
      const device = new Device(token, { logLevel: 'warn' })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      device.on('error', (err: any) => {
        toast.error(`Dialer: ${err?.message ?? 'Unknown error'}`)
        setStatus('ready')
      })

      await device.register()
      deviceRef.current = device
      setStatus('ready')
      return device
    } catch (err) {
      toast.error('Could not start dialer. Check microphone permissions.')
      setStatus('idle')
      return null
    }
  }

  async function startCall() {
    const device = await getOrCreateDevice()
    if (!device) return

    setStatus('connecting')
    setSeconds(0)
    setIsMuted(false)

    try {
      const call = await device.connect({
        params: {
          // Use to_number instead of To to avoid collision with
          // Twilio's built-in To field (set to the client identity)
          to_number: phoneNumber,
          from_number: selectedCallerId,
        },
      })
      callRef.current = call

      call.on('accept', () => {
        setStatus('in-call')
        timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
      })

      call.on('disconnect', () => {
        endCall()
      })

      call.on('cancel', () => {
        cleanup()
        setStatus('ready')
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      call.on('error', (err: any) => {
        toast.error(err?.message ?? 'Call failed')
        cleanup()
        setStatus('ready')
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start call')
      setStatus('ready')
    }
  }

  function endCall() {
    cleanup()
    setStatus('ended')
    setPostCallOpen(true)
  }

  function hangUp() {
    if (callRef.current) callRef.current.disconnect()
    cleanup()
    setStatus('ended')
    setPostCallOpen(true)
  }

  function cleanup() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    callRef.current = null
    setIsMuted(false)
  }

  function toggleMute() {
    if (!callRef.current) return
    const next = !isMuted
    callRef.current.mute(next)
    setIsMuted(next)
  }

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const active = status === 'connecting' || status === 'in-call'

  return (
    <div className="flex flex-col gap-1.5">
      {/* Phone number + call button row */}
      <div className="flex items-center gap-2">
        <a
          href={`tel:${phoneNumber}`}
          className="text-sm font-medium hover:underline"
        >
          {phoneNumber}
        </a>

        {!active && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
            onClick={startCall}
            disabled={status === 'loading' || status === 'ended' || (callerIds.length > 0 && !selectedCallerId)}
            title={`Call ${leadName ?? phoneNumber} via Acendia CRM`}
          >
            {status === 'loading' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Phone className="h-3.5 w-3.5" />
            )}
          </Button>
        )}
      </div>

      {/* Caller ID selector — always visible when 2 numbers configured, before and after calls */}
      {callerIds.length > 1 && !active && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">From:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] px-2 gap-1 text-muted-foreground font-normal"
              >
                {selectedCallerId || 'Select number'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {callerIds.map(id => (
                <DropdownMenuItem
                  key={id}
                  onClick={() => setSelectedCallerId(id)}
                  className="text-xs gap-2"
                >
                  {id === selectedCallerId && <span className="text-green-600">✓</span>}
                  {id}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {/* In-call control bar */}
      {active && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 px-3 py-1.5">
          <span
            className={`h-2 w-2 rounded-full shrink-0 ${
              status === 'in-call' ? 'bg-green-500 animate-pulse' : 'bg-amber-400 animate-pulse'
            }`}
          />
          {status === 'connecting' ? (
            <span className="text-xs text-green-700 dark:text-green-400 flex-1">
              Connecting to {phoneNumber}…
            </span>
          ) : (
            <span className="text-xs font-mono text-green-700 dark:text-green-400 flex-1">
              {fmt(seconds)}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={toggleMute}
            disabled={status !== 'in-call'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <Mic className="h-3.5 w-3.5 text-green-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={hangUp}
            title="Hang up"
          >
            <PhoneOff className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      )}

      {status === 'ended' && !postCallOpen && (
        <p className="text-xs text-muted-foreground">Call ended</p>
      )}

      <PostCallLogDialog
        open={postCallOpen}
        onOpenChange={(v) => {
          setPostCallOpen(v)
          if (!v) setStatus('ready')
        }}
        leadId={leadId}
        leadName={leadName}
        userId={userId}
        durationSeconds={seconds}
      />
    </div>
  )
}
