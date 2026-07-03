'use client'

import * as React from 'react'
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Loader2,
  X,
  Delete,
  Search,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PostCallLogDialog } from './PostCallLogDialog'

type CallStatus = 'idle' | 'loading' | 'ready' | 'connecting' | 'in-call' | 'ended'

const DIAL_KEYS = [
  [{ d: '1', s: '' }, { d: '2', s: 'ABC' }, { d: '3', s: 'DEF' }],
  [{ d: '4', s: 'GHI' }, { d: '5', s: 'JKL' }, { d: '6', s: 'MNO' }],
  [{ d: '7', s: 'PQRS' }, { d: '8', s: 'TUV' }, { d: '9', s: 'WXYZ' }],
  [{ d: '*', s: '' }, { d: '0', s: '+' }, { d: '#', s: '' }],
]

interface LeadResult {
  id: string
  company_name: string
  contact_person: string
  phone: string | null
}

interface DialerPadProps {
  userId: string
  initialCallerIds?: string[]
}

export function DialerPad({ userId, initialCallerIds = [] }: DialerPadProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [phoneInput, setPhoneInput] = React.useState('')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [leadResults, setLeadResults] = React.useState<LeadResult[]>([])
  const [selectedLead, setSelectedLead] = React.useState<LeadResult | null>(null)
  const [isSearching, setIsSearching] = React.useState(false)

  const [status, setStatus] = React.useState<CallStatus>('idle')
  const [isMuted, setIsMuted] = React.useState(false)
  const [seconds, setSeconds] = React.useState(0)
  const [callerIds, setCallerIds] = React.useState<string[]>(initialCallerIds)
  const [selectedCallerId, setSelectedCallerId] = React.useState(initialCallerIds[0] ?? '')
  const [postCallOpen, setPostCallOpen] = React.useState(false)
  const [twilioCallSid, setTwilioCallSid] = React.useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceRef = React.useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callRef = React.useRef<any>(null)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (deviceRef.current) { try { deviceRef.current.destroy() } catch { /* ignore */ } }
    }
  }, [])

  // Debounced lead search
  React.useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (!searchQuery.trim()) { setLeadResults([]); return }
    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true)
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.from('leads') as any)
        .select('id, company_name, contact_person, phone')
        .or(`company_name.ilike.%${searchQuery}%,contact_person.ilike.%${searchQuery}%`)
        .not('phone', 'is', null)
        .limit(5)
      setLeadResults((data ?? []) as LeadResult[])
      setIsSearching(false)
    }, 300)
  }, [searchQuery])

  function pressKey(key: string) {
    if (status === 'in-call' && callRef.current) {
      callRef.current.sendDigits(key)
      // Show last 8 pressed digits as DTMF feedback
      setPhoneInput(prev => (prev + key).slice(-8))
    } else {
      setPhoneInput(prev => prev + key)
    }
  }

  function backspace() {
    setPhoneInput(prev => prev.slice(0, -1))
  }

  function selectLead(lead: LeadResult) {
    setSelectedLead(lead)
    setPhoneInput(lead.phone ?? '')
    setSearchQuery('')
    setLeadResults([])
  }

  function clearSelection() {
    setSelectedLead(null)
    setPhoneInput('')
  }

  async function getOrCreateDevice() {
    if (deviceRef.current) return deviceRef.current

    setStatus('loading')
    try {
      const res = await fetch('/api/twilio/token', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to get call token')
      const { token, callerIds: ids } = await res.json()
      if (ids?.length) {
        setCallerIds(ids)
        setSelectedCallerId(prev => prev || ids[0])
      }
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
      toast.error(err instanceof Error ? err.message : 'Could not initialize dialer')
      setStatus('idle')
      return null
    }
  }

  async function startCall() {
    const number = phoneInput.trim()
    if (!number) return
    const device = await getOrCreateDevice()
    if (!device) return

    setStatus('connecting')
    setSeconds(0)
    setIsMuted(false)

    try {
      const call = await device.connect({
        params: { to_number: number, from_number: selectedCallerId },
      })
      callRef.current = call
      call.on('accept', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTwilioCallSid((call as any).parameters?.CallSid ?? null)
        setStatus('in-call')
        timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
      })
      call.on('disconnect', () => endCall())
      call.on('cancel', () => { cleanup(); setStatus('ready') })
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
    setTwilioCallSid(null)
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
  const canCall = phoneInput.trim().length >= 5 && !active && status !== 'loading'

  return (
    <>
      {/* Collapsed FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          title="Open Dialer"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-foreground hover:bg-foreground/80 text-background shadow-xl transition-colors"
        >
          <Phone className="h-6 w-6" />
          {active && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-red-500 animate-pulse border-2 border-background" />
          )}
        </button>
      )}

      {/* Expanded dialer panel */}
      {isOpen && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-72 rounded-2xl border bg-background shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-foreground" />
              <span className="text-sm font-semibold">Dialer</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 space-y-3">
            {/* Lead search — hidden while in call */}
            {!active && (
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search lead by name…"
                  className="pl-8 h-8 text-xs"
                />
                {isSearching && (
                  <Loader2 className="absolute right-2.5 top-2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
                {leadResults.length > 0 && (
                  <div className="absolute top-full mt-1 w-full rounded-md border bg-background shadow-lg z-10 overflow-hidden">
                    {leadResults.map(lead => (
                      <button
                        key={lead.id}
                        onClick={() => selectLead(lead)}
                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                      >
                        <p className="text-xs font-medium">{lead.company_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {lead.contact_person} · {lead.phone}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected lead chip */}
            {selectedLead && !active && (
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5">
                <div>
                  <p className="text-xs font-medium">{selectedLead.company_name}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedLead.contact_person}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={clearSelection}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Phone number display */}
            <div className="flex items-center gap-1.5">
              <Input
                value={phoneInput}
                onChange={e => !active && setPhoneInput(e.target.value)}
                placeholder={status === 'in-call' ? 'DTMF tones…' : '+64 9 000 0000'}
                className="text-center font-mono text-base tracking-widest h-10 flex-1"
                readOnly={active}
              />
              {!active && phoneInput && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={backspace}>
                  <Delete className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* In-call status bar */}
            {active && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2">
                <span className={`h-2 w-2 rounded-full shrink-0 animate-pulse ${status === 'in-call' ? 'bg-foreground' : 'bg-amber-400'}`} />
                {status === 'connecting' ? (
                  <span className="text-xs text-muted-foreground flex-1">Connecting…</span>
                ) : (
                  <span className="text-xs font-mono text-foreground flex-1">{fmt(seconds)}</span>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted
                    ? <MicOff className="h-3.5 w-3.5 text-amber-500" />
                    : <Mic className="h-3.5 w-3.5 text-foreground" />
                  }
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={hangUp} title="Hang up">
                  <PhoneOff className="h-3.5 w-3.5 text-red-500" />
                </Button>
              </div>
            )}

            {/* Dial pad — shown before and during call (DTMF in-call) */}
            {status !== 'connecting' && (
              <>
                {status === 'in-call' && (
                  <p className="text-[10px] text-center text-muted-foreground -mb-1">
                    IVR Keypad — tap to send tones
                  </p>
                )}
                <div className="grid grid-cols-3 gap-1.5">
                  {DIAL_KEYS.flat().map(({ d, s }) => (
                    <button
                      key={d}
                      onClick={() => pressKey(d)}
                      className="flex flex-col items-center justify-center h-11 rounded-xl border bg-card hover:bg-muted active:scale-95 transition-all select-none"
                    >
                      <span className="text-sm font-medium leading-none">{d}</span>
                      {s && <span className="text-[9px] text-muted-foreground leading-none mt-0.5">{s}</span>}
                    </button>
                  ))}
                </div>
              </>

            )}

            {/* Caller ID selector + Call button */}
            {!active && (
              <div className="space-y-2 pt-1">
                {callerIds.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground shrink-0">From:</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2 gap-1 flex-1 justify-between font-normal text-muted-foreground"
                        >
                          {selectedCallerId || 'Select number'}
                          <ChevronDown className="h-3 w-3 shrink-0" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        {callerIds.map(id => (
                          <DropdownMenuItem
                            key={id}
                            onClick={() => setSelectedCallerId(id)}
                            className="text-xs gap-2"
                          >
                            {id === selectedCallerId && <span className="text-foreground">✓</span>}
                            {id}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                <Button
                  className="w-full gap-2"
                  onClick={startCall}
                  disabled={!canCall}
                >
                  {status === 'loading' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                  {phoneInput.trim() ? `Call ${phoneInput}` : 'Enter a number'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post-call log dialog */}
      <PostCallLogDialog
        open={postCallOpen}
        onOpenChange={(v) => {
          setPostCallOpen(v)
          if (!v) setStatus('ready')
        }}
        leadId={selectedLead?.id ?? null}
        leadName={selectedLead?.company_name ?? null}
        userId={userId}
        durationSeconds={seconds}
        twilioCallSid={twilioCallSid}
      />
    </>
  )
}
