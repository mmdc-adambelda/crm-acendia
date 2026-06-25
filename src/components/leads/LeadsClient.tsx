'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus,
  Upload,
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
import { StatusBadge, LeadScoreBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LeadFilters } from './LeadFilters'
import { LeadForm } from './LeadForm'
import { CSVImport } from './CSVImport'
import { formatCurrency, formatRelativeTime, getInitials } from '@/lib/utils'
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

const SORTABLE_COLS = [
  { key: 'company_name', label: 'Company' },
  { key: 'contact_person', label: 'Contact' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'deal_value', label: 'Deal Value' },
  { key: 'lead_score', label: 'Score' },
  { key: 'created_at', label: 'Created' },
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
  autoOpenCreate?: boolean
}

function SortIcon({ col, sort, order }: { col: string; sort: string; order: string }) {
  if (sort !== col) return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50 ml-1" />
  return order === 'asc' ? (
    <ChevronUp className="h-3.5 w-3.5 ml-1 text-foreground" />
  ) : (
    <ChevronDown className="h-3.5 w-3.5 ml-1 text-foreground" />
  )
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
  autoOpenCreate = false,
}: LeadsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [sheetOpen, setSheetOpen] = React.useState(autoOpenCreate)
  const [editingLead, setEditingLead] = React.useState<LeadRow | null>(null)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false)
  const [csvOpen, setCsvOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [isAssigning, setIsAssigning] = React.useState(false)

  // Clear autoOpen param from URL after opening
  React.useEffect(() => {
    if (autoOpenCreate) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete('new')
      router.replace(`/leads?${params.toString()}`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map((l) => l.id)))
    }
  }

  function openEdit(lead: LeadRow) {
    setEditingLead(lead)
    setSheetOpen(true)
  }

  function openCreate() {
    setEditingLead(null)
    setSheetOpen(true)
  }

  function closeSheet() {
    setSheetOpen(false)
    setEditingLead(null)
  }

  async function handleDelete(id: string) {
    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('leads').delete().eq('id', id)
    setIsDeleting(false)
    setDeleteId(null)
    if (error) {
      toast.error(error.message)
      return
    }
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
    if (error) {
      toast.error(error.message)
      return
    }
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
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(`Deleted ${ids.length} lead${ids.length !== 1 ? 's' : ''}`)
    setSelected(new Set())
    router.refresh()
  }

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
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete {selected.size}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <LeadFilters teamMembers={teamMembers} total={total} />

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              {SORTABLE_COLS.map((col) => (
                <TableHead
                  key={col.key}
                  className={`cursor-pointer select-none whitespace-nowrap ${
                    col.key === 'deal_value' || col.key === 'lead_score' ? 'text-right' : ''
                  }`}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center">
                    {col.label}
                    <SortIcon col={col.key} sort={sort} order={order} />
                  </span>
                </TableHead>
              ))}
              <TableHead>Assignee</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-64">
                  <EmptyState
                    icon={Users2}
                    title="No leads found"
                    description="Add your first lead or adjust your filters."
                    action={{ label: 'Add Lead', onClick: openCreate }}
                  />
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className={selected.has(lead.id) ? 'bg-muted/50' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(lead.id)}
                      onCheckedChange={() => toggleSelect(lead.id)}
                      aria-label={`Select ${lead.company_name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {lead.company_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {lead.contact_person}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={lead.status as LeadStatus} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{lead.source}</TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {lead.deal_value != null ? formatCurrency(lead.deal_value) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <LeadScoreBadge score={lead.lead_score} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatRelativeTime(lead.created_at)}
                  </TableCell>
                  <TableCell>
                    {lead.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={lead.assignee.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(lead.assignee.full_name ?? '')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                          {lead.assignee.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
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
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => openEdit(lead)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
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
              ))
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
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => handlePage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-3 tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => handlePage(page + 1)}
              >
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
    </>
  )
}
