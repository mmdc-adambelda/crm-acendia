'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus,
  Upload,
  Download,
  Trash2,
  Pencil,
  Eye,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Users2,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Loader2,
  Grid3X3,
  ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LeadScoreBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LeadFilters } from './LeadFilters'
import { LeadForm } from './LeadForm'
import { CSVImport } from './CSVImport'
import { PostCallLogDialog } from '@/components/dialer/PostCallLogDialog'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import type { LeadStatus } from '@/types'

type TeamMember = { id: string; full_name: string | null; avatar_url: string | null }

type LeadRow = {
  id: string
  company_name: string
  contact_person: string
  email: string
  phone: string | null
  website: string | null
  industry: string | null
  location: string | null
  notes: string | null
  status: string
  source: string
  deal_value: number | null
  probability: number | null
  lead_score: number
  assigned_to: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  assignee: { id: string; full_name: string | null; avatar_url: string | null } | null
}

type DialerStatus = 'idle' | 'loading' | 'connecting' | 'in-call' | 'ended'

const LEAD_STATUSES: LeadStatus[] = [
  'New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost',
]

type LastCall = { lead_id: string; call_outcome: string; call_date: string }

const OUTCOME_COLORS: Record<string, string> = {
  'Booked Meeting':  'text-blue-600',
  'Interested':      'text-emerald-600',
  'Callback':        'text-amber-600',
  'Not Interested':  'text-red-500',
  'No Answer':       'text-slate-500',
}

const STATUS_COLORS: Record<string, string> = {
  'New':           'text-blue-600',
  'Contacted':     'text-violet-600',
  'Qualified':     'text-amber-600',
  'Proposal Sent': 'text-orange-600',
  'Negotiation':   'text-pink-600',
  'Won':           'text-emerald-600',
  'Lost':          'text-red-600',
}

const DTMF_KEYS = [
  [{ d: '1', s: '' },    { d: '2', s: 'ABC' },  { d: '3', s: 'DEF' }],
  [{ d: '4', s: 'GHI' }, { d: '5', s: 'JKL' },  { d: '6', s: 'MNO' }],
  [{ d: '7', s: 'PQRS'},{ d: '8', s: 'TUV' },  { d: '9', s: 'WXYZ'}],
  [{ d: '*', s: '' },    { d: '0', s: '+' },     { d: '#', s: '' }],
]

const SORTABLE_COLS = [
  { key: 'company_name', label: 'Company' },
  { key: 'status',       label: 'Status' },
  { key: 'lead_score',   label: 'Score' },
  { key: 'created_at',   label: 'Added' },
] as const

const PER_PAGE_OPTIONS = [20, 50, 100] as const

interface LeadsClientProps {
  leads: LeadRow[]
  total: number
  page: number
  perPage: number
  sort: string
  order: string
  teamMembers: TeamMember[]
  userId: string
  initialCallerIds?: string[]
  lastCallMap?: Record<string, LastCall>
  autoOpenCreate?: boolean
}

function SortIcon({ col, sort, order }: { col: string; sort: string; order: string }) {
  if (sort !== col) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 ml-1" />
  return order === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5 ml-1 text-foreground" />
    : <ChevronDown className="h-3.5 w-3.5 ml-1 text-foreground" />
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function LeadsClient({
  leads,
  total,
  page,
  perPage,
  sort,
  order,
  teamMembers,
  userId,
  initialCallerIds = [],
  lastCallMap = {},
  autoOpenCreate = false,
}: LeadsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── List state ────────────────────────────────────────────────────────────
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [sheetOpen, setSheetOpen] = React.useState(autoOpenCreate)
  const [editingLead, setEditingLead] = React.useState<LeadRow | null>(null)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false)
  const [csvOpen, setCsvOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isAssigning, setIsAssigning] = React.useState(false)

  // ── Dialer state ─────────────────────────────────────────────────────────
  const [callerIds, setCallerIds] = React.useState<string[]>(initialCallerIds)
  const [selectedCallerId, setSelectedCallerId] = React.useState(initialCallerIds[0] ?? '')
  const [activeLead, setActiveLead] = React.useState<{ id: string; company_name: string; phone: string } | null>(null)
  const [dialerStatus, setDialerStatus] = React.useState<DialerStatus>('idle')
  const [callSeconds, setCallSeconds] = React.useState(0)
  const [isMuted, setIsMuted] = React.useState(false)
  const [dtmfInput, setDtmfInput] = React.useState('')
  const [dtmfOpen, setDtmfOpen] = React.useState(false)
  const [twilioCallSid, setTwilioCallSid] = React.useState<string | null>(null)
  const [logCallFor, setLogCallFor] = React.useState<{ leadId: string; leadName: string; durationSeconds: number; twilioCallSid?: string | null } | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceRef = React.useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callRef = React.useRef<any>(null)
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

  React.useEffect(() => {
    if (autoOpenCreate) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('new')
      router.replace(`/leads?${params.toString()}`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (deviceRef.current) { try { deviceRef.current.destroy() } catch { /* ignore */ } }
    }
  }, [])

  // ── URL helpers ───────────────────────────────────────────────────────────
  function buildURL(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(overrides).forEach(([key, value]) => {
      if (value) params.set(key, value)
      else params.delete(key)
    })
    return `/leads?${params.toString()}`
  }

  function handleSort(col: string) {
    const newOrder = sort === col && order === 'asc' ? 'desc' : 'asc'
    router.push(buildURL({ sort: col, order: newOrder, page: '1' }))
  }

  function handlePage(p: number) {
    router.push(buildURL({ page: String(p) }))
  }

  function handlePerPage(v: string) {
    router.push(buildURL({ per_page: v, page: '1' }))
  }

  function exportURL() {
    const params = new URLSearchParams()
    ;(['q', 'status', 'source', 'assigned_to', 'last_call'] as const).forEach((key) => {
      const value = searchParams.get(key)
      if (value) params.set(key, value)
    })
    return `/api/leads/export?${params.toString()}`
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === leads.length) setSelected(new Set())
    else setSelected(new Set(leads.map((l) => l.id)))
  }

  // ── Lead CRUD ─────────────────────────────────────────────────────────────
  function openEdit(lead: LeadRow) { setEditingLead(lead); setSheetOpen(true) }
  function openCreate() { setEditingLead(null); setSheetOpen(true) }
  function closeSheet() { setSheetOpen(false); setEditingLead(null) }

  async function handleDelete(id: string) {
    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('leads').delete().eq('id', id)
    setIsDeleting(false)
    setDeleteId(null)
    if (error) { toast.error(error.message); return }
    toast.success('Lead deleted')
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n })
    router.refresh()
  }

  async function handleBulkAssign(memberId: string) {
    setIsAssigning(true)
    const supabase = createClient()
    const ids = Array.from(selected)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('leads') as any).update({ assigned_to: memberId }).in('id', ids)
    setIsAssigning(false)
    if (error) { toast.error(error.message); return }
    const member = teamMembers.find(m => m.id === memberId)
    toast.success(`Assigned ${ids.length} lead${ids.length !== 1 ? 's' : ''} to ${member?.full_name ?? 'user'}`)
    setSelected(new Set())
    router.refresh()
  }

  async function handleBulkDelete() {
    setIsDeleting(true)
    const supabase = createClient()
    const ids = Array.from(selected)
    const { error } = await supabase.from('leads').delete().in('id', ids)
    setIsDeleting(false)
    setBulkDeleteOpen(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Deleted ${ids.length} lead${ids.length !== 1 ? 's' : ''}`)
    setSelected(new Set())
    router.refresh()
  }

  async function handleStatusChange(leadId: string, newStatus: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('leads') as any).update({ status: newStatus }).eq('id', leadId)
    if (error) { toast.error('Failed to update status'); return }
    router.refresh()
  }

  // ── Dialer functions ──────────────────────────────────────────────────────
  async function getOrCreateDevice() {
    if (deviceRef.current) return deviceRef.current
    setDialerStatus('loading')
    try {
      const res = await fetch('/api/twilio/token', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to get call token')
      const { token, callerIds: ids } = await res.json()
      if (ids?.length) { setCallerIds(ids); setSelectedCallerId(prev => prev || ids[0]) }
      const { Device } = await import('@twilio/voice-sdk')
      const device = new Device(token, { logLevel: 'warn' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      device.on('error', (err: any) => { toast.error(err?.message ?? 'Dialer error'); setDialerStatus('idle') })
      await device.register()
      deviceRef.current = device
      setDialerStatus('idle')
      return device
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not initialize dialer')
      setDialerStatus('idle')
      return null
    }
  }

  async function startCall(lead: LeadRow) {
    if (!lead.phone) return
    const device = await getOrCreateDevice()
    if (!device) return
    setActiveLead({ id: lead.id, company_name: lead.company_name, phone: lead.phone })
    setDialerStatus('connecting')
    setCallSeconds(0)
    setIsMuted(false)
    setDtmfInput('')
    try {
      const call = await device.connect({
        params: { to_number: lead.phone, from_number: selectedCallerId },
      })
      callRef.current = call
      call.on('accept', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTwilioCallSid((call as any).parameters?.CallSid ?? null)
        setDialerStatus('in-call')
        timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000)
      })
      call.on('disconnect', () => endCall())
      call.on('cancel', () => { cleanupCall(); setDialerStatus('idle'); setActiveLead(null) })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      call.on('error', (err: any) => { toast.error(err?.message ?? 'Call failed'); cleanupCall(); setDialerStatus('idle'); setActiveLead(null) })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start call')
      cleanupCall()
      setDialerStatus('idle')
      setActiveLead(null)
    }
  }

  function endCall() {
    const seconds = callSeconds
    const lead = activeLead
    const sid = twilioCallSid
    cleanupCall()
    setDialerStatus('ended')
    if (lead) setLogCallFor({ leadId: lead.id, leadName: lead.company_name, durationSeconds: seconds, twilioCallSid: sid })
  }

  function hangUp() {
    if (callRef.current) callRef.current.disconnect()
    endCall()
  }

  function cleanupCall() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    callRef.current = null
    setIsMuted(false)
    setDtmfInput('')
    setDtmfOpen(false)
    setTwilioCallSid(null)
  }

  function toggleMute() {
    if (!callRef.current) return
    const next = !isMuted
    callRef.current.mute(next)
    setIsMuted(next)
  }

  function sendDtmf(key: string) {
    if (!callRef.current) return
    callRef.current.sendDigits(key)
    setDtmfInput(prev => (prev + key).slice(-8))
  }

  const isCallActive = dialerStatus === 'connecting' || dialerStatus === 'in-call' || dialerStatus === 'loading'

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / perPage)
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)
  const allSelected = leads.length > 0 && selected.size === leads.length
  const someSelected = selected.size > 0

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage and track your sales leads</p>
        </div>
        <div className="flex items-center gap-2">
          {someSelected && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2" disabled={isAssigning}>
                    <Users2 className="h-4 w-4" />
                    Assign {selected.size}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {teamMembers.map((m) => (
                    <DropdownMenuItem key={m.id} onClick={() => handleBulkAssign(m.id)}>
                      {m.full_name ?? m.id}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete {selected.size}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href={exportURL()} download>
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <LeadFilters teamMembers={teamMembers} total={total} />

      {/* ── Active Call Banner ─────────────────────────────────────────────── */}
      {activeLead && isCallActive && (
        <div className="sticky top-0 z-20 rounded-xl border bg-muted/80 backdrop-blur shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
          {/* Status dot + lead info */}
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 animate-pulse ${dialerStatus === 'in-call' ? 'bg-foreground' : 'bg-amber-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{activeLead.company_name}</p>
            <p className="text-xs text-muted-foreground">{activeLead.phone}</p>
          </div>

          {/* Timer */}
          <span className="font-mono text-sm tabular-nums">
            {dialerStatus === 'connecting' ? 'Connecting…' : fmt(callSeconds)}
          </span>

          {/* Caller ID (shown only when idle/ready, before connecting) */}
          {callerIds.length > 1 && dialerStatus === 'connecting' && (
            <span className="text-xs text-muted-foreground hidden sm:block">from {selectedCallerId}</span>
          )}

          {/* DTMF Popover */}
          {dialerStatus === 'in-call' && (
            <Popover open={dtmfOpen} onOpenChange={setDtmfOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" title="IVR Keypad">
                  <Grid3X3 className="h-3.5 w-3.5" />
                  {dtmfInput ? <span className="font-mono">{dtmfInput}</span> : 'Keypad'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3" align="end">
                <p className="text-[10px] text-center text-muted-foreground mb-2">IVR — tap to send tone</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {DTMF_KEYS.flat().map(({ d, s }) => (
                    <button
                      key={d}
                      onClick={() => sendDtmf(d)}
                      className="flex flex-col items-center justify-center h-10 rounded-lg border bg-card hover:bg-muted active:scale-95 transition-all select-none"
                    >
                      <span className="text-sm font-medium leading-none">{d}</span>
                      {s && <span className="text-[9px] text-muted-foreground leading-none mt-0.5">{s}</span>}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Mute */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={toggleMute}
            disabled={dialerStatus !== 'in-call'}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="h-4 w-4 text-amber-500" /> : <Mic className="h-4 w-4" />}
          </Button>

          {/* Hang up */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={hangUp}
          >
            <PhoneOff className="h-3.5 w-3.5" />
            Hang Up
          </Button>
        </div>
      )}

      {/* Caller ID selector — shown only when no active call and 2+ numbers */}
      {!isCallActive && callerIds.length > 1 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-xs">Calling from:</span>
          <Select value={selectedCallerId} onValueChange={setSelectedCallerId}>
            <SelectTrigger className="h-7 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {callerIds.map(id => (
                <SelectItem key={id} value={id} className="text-xs">{id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
              </TableHead>

              {/* Company sortable */}
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap min-w-[180px]"
                onClick={() => handleSort('company_name')}
              >
                <span className="inline-flex items-center">
                  Company
                  <SortIcon col="company_name" sort={sort} order={order} />
                </span>
              </TableHead>

              {/* Phone — static */}
              <TableHead className="whitespace-nowrap">Phone</TableHead>

              {/* Status sortable */}
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort('status')}
              >
                <span className="inline-flex items-center">
                  Status
                  <SortIcon col="status" sort={sort} order={order} />
                </span>
              </TableHead>

              {/* Last Call — static */}
              <TableHead className="whitespace-nowrap">Last Call</TableHead>

              {/* Score sortable */}
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap text-right"
                onClick={() => handleSort('lead_score')}
              >
                <span className="inline-flex items-center justify-end w-full">
                  Score
                  <SortIcon col="lead_score" sort={sort} order={order} />
                </span>
              </TableHead>

              {/* Added sortable */}
              <TableHead
                className="cursor-pointer select-none whitespace-nowrap"
                onClick={() => handleSort('created_at')}
              >
                <span className="inline-flex items-center">
                  Added
                  <SortIcon col="created_at" sort={sort} order={order} />
                </span>
              </TableHead>

              <TableHead>Assignee</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-64">
                  <EmptyState
                    icon={Users2}
                    title="No leads found"
                    description="Add your first lead or adjust your filters."
                    action={{ label: 'Add Lead', onClick: openCreate }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const isThisCallActive = activeLead?.id === lead.id && isCallActive
                return (
                  <TableRow key={lead.id} className={selected.has(lead.id) ? 'bg-muted/50' : ''}>
                    {/* Checkbox */}
                    <TableCell>
                      <Checkbox
                        checked={selected.has(lead.id)}
                        onCheckedChange={() => toggleSelect(lead.id)}
                        aria-label={`Select ${lead.company_name}`}
                      />
                    </TableCell>

                    {/* Company + Contact */}
                    <TableCell>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium hover:text-primary transition-colors block leading-tight"
                      >
                        {lead.company_name}
                      </Link>
                      <span className="text-xs text-muted-foreground">{lead.contact_person}</span>
                    </TableCell>

                    {/* Phone + Call button */}
                    <TableCell className="whitespace-nowrap">
                      {lead.phone ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm tabular-nums">{lead.phone}</span>
                          {isThisCallActive ? (
                            <span className={`h-2 w-2 rounded-full animate-pulse ${dialerStatus === 'in-call' ? 'bg-foreground' : 'bg-amber-400'}`} />
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 hover:bg-muted"
                              disabled={isCallActive}
                              onClick={() => startCall(lead)}
                              title={`Call ${lead.company_name}`}
                            >
                              {dialerStatus === 'loading' && activeLead?.id === lead.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Phone className="h-3.5 w-3.5" />
                              }
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    {/* Status — inline Select */}
                    <TableCell>
                      <Select
                        value={lead.status}
                        onValueChange={(v) => handleStatusChange(lead.id, v)}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs border-0 shadow-none px-2 focus:ring-0 hover:bg-muted">
                          <span className={`font-medium ${STATUS_COLORS[lead.status] ?? ''}`}>
                            {lead.status}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {LEAD_STATUSES.map(s => (
                            <SelectItem key={s} value={s} className="text-xs">
                              <span className={STATUS_COLORS[s] ?? ''}>{s}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Last Call */}
                    <TableCell className="whitespace-nowrap">
                      {lastCallMap[lead.id] ? (
                        <div>
                          <span className={`text-xs font-medium ${OUTCOME_COLORS[lastCallMap[lead.id].call_outcome] ?? 'text-muted-foreground'}`}>
                            {lastCallMap[lead.id].call_outcome}
                          </span>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatRelativeTime(lastCallMap[lead.id].call_date)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    {/* Score */}
                    <TableCell className="text-right">
                      <LeadScoreBadge score={lead.lead_score} />
                    </TableCell>

                    {/* Added */}
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {formatRelativeTime(lead.created_at)}
                    </TableCell>

                    {/* Assignee */}
                    <TableCell>
                      {lead.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">
                              {getInitials(lead.assignee.full_name ?? '')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-muted-foreground truncate max-w-[80px]">
                            {lead.assignee.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/leads/${lead.id}`} className="gap-2 cursor-pointer">
                              <Eye className="h-3.5 w-3.5" />
                              View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => openEdit(lead)}>
                            <Pencil className="h-3.5 w-3.5" />
                            Edit Lead
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => setLogCallFor({ leadId: lead.id, leadName: lead.company_name, durationSeconds: 0 })}
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                            Log Call
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(lead.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-muted-foreground">
            Showing {from}–{to} of {total.toLocaleString()} leads
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>Per page:</span>
              <Select value={String(perPage)} onValueChange={handlePerPage}>
                <SelectTrigger className="h-8 w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => handlePage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-3 tabular-nums">{page} / {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => handlePage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={(v) => { if (!v) closeSheet() }}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>{editingLead ? 'Edit Lead' : 'Create New Lead'}</SheetTitle>
          </SheetHeader>
          <LeadForm
            lead={editingLead}
            teamMembers={teamMembers}
            userId={userId}
            onSuccess={closeSheet}
            onCancel={closeSheet}
          />
        </SheetContent>
      </Sheet>

      {/* Delete single */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => { if (!v) setDeleteId(null) }}
        title="Delete Lead"
        description="This lead and all its related data will be permanently deleted. This action cannot be undone."
        variant="destructive"
        confirmLabel="Delete Lead"
        onConfirm={() => { if (deleteId) handleDelete(deleteId) }}
        isPending={isDeleting}
      />

      {/* Bulk delete */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selected.size} Leads`}
        description={`You are about to permanently delete ${selected.size} leads. This action cannot be undone.`}
        variant="destructive"
        confirmLabel={`Delete ${selected.size} Leads`}
        onConfirm={handleBulkDelete}
        isPending={isDeleting}
      />

      {/* CSV Import */}
      <CSVImport open={csvOpen} onOpenChange={setCsvOpen} userId={userId} teamMembers={teamMembers} />

      {/* Post-call log dialog — triggered after Twilio call ends OR manual log */}
      <PostCallLogDialog
        open={logCallFor !== null}
        onOpenChange={(v) => {
          if (!v) {
            setLogCallFor(null)
            setActiveLead(null)
            setDialerStatus('idle')
            router.refresh()
          }
        }}
        leadId={logCallFor?.leadId ?? undefined}
        leadName={logCallFor?.leadName ?? undefined}
        userId={userId}
        durationSeconds={logCallFor?.durationSeconds ?? 0}
        twilioCallSid={logCallFor?.twilioCallSid}
      />
    </>
  )
}
