'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, MoreHorizontal, Building2, Link2, Users2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { ClientForm, type ClientRow } from './ClientForm'
import type { OnboardingStatus } from '@/types'
import Link from 'next/link'

type LeadOption = { id: string; company_name: string }
type TeamMember = { id: string; full_name: string | null; avatar_url: string | null }

type ClientWithRelations = ClientRow & {
  assignee: { full_name: string | null; avatar_url: string | null } | null
  lead: { id: string; company_name: string } | null
}

interface ClientsClientProps {
  clients: ClientWithRelations[]
  leads: LeadOption[]
  teamMembers: TeamMember[]
  userId: string
}

function getInitials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function ClientsClient({ clients, leads, teamMembers, userId }: ClientsClientProps) {
  const router = useRouter()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [editingClient, setEditingClient] = React.useState<ClientRow | null>(null)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete(id: string) {
    setIsDeleting(true)
    const supabase = createSupabaseClient()
    const { error } = await supabase.from('clients').delete().eq('id', id)
    setIsDeleting(false)
    setDeleteId(null)
    if (error) { toast.error(error.message); return }
    toast.success('Client deleted')
    router.refresh()
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {clients.length} client{clients.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={() => { setEditingClient(null); setSheetOpen(true) }} className="gap-2">
          <Plus className="h-4 w-4" />
          New Client
        </Button>
      </div>

      {/* List */}
      {clients.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No clients yet"
          description="Create your first client or convert a won lead"
          action={{ label: 'New Client', onClick: () => { setEditingClient(null); setSheetOpen(true) } }}
        />
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Company</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">Contact</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden lg:table-cell">Package</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Retainer</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden sm:table-cell">Onboarding</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden xl:table-cell">Contract End</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden xl:table-cell">Assignee</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden lg:table-cell">Source Lead</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map(client => (
                <tr key={client.id} className="group hover:bg-muted/30 transition-colors">
                  {/* Company */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate max-w-[180px]">{client.company}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    <p className="text-sm truncate max-w-[160px]">{client.contact_person}</p>
                    <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                  </td>

                  {/* Package */}
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">{client.package ?? '—'}</span>
                  </td>

                  {/* Retainer */}
                  <td className="px-4 py-2.5">
                    {client.monthly_retainer ? (
                      <span className="font-semibold">${client.monthly_retainer.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  {/* Onboarding */}
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <StatusBadge status={client.onboarding_status as OnboardingStatus} />
                  </td>

                  {/* Contract end */}
                  <td className="px-4 py-2.5 hidden xl:table-cell text-sm text-muted-foreground">
                    {client.contract_end
                      ? format(parseISO(client.contract_end), 'MMM d, yyyy')
                      : <span className="text-muted-foreground/50">—</span>}
                  </td>

                  {/* Assignee */}
                  <td className="px-4 py-2.5 hidden xl:table-cell">
                    {client.assignee ? (
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold overflow-hidden">
                          {client.assignee.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={client.assignee.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            getInitials(client.assignee.full_name)
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {client.assignee.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">Unassigned</span>
                    )}
                  </td>

                  {/* Source lead */}
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    {client.lead ? (
                      <Link
                        href={`/leads/${client.lead.id}`}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Link2 className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[120px]">{client.lead.company_name}</span>
                      </Link>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-2 py-2.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingClient(client); setSheetOpen(true) }}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(client.id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>{editingClient ? 'Edit Client' : 'New Client'}</SheetTitle>
          </SheetHeader>
          <ClientForm
            client={editingClient}
            leads={leads}
            teamMembers={teamMembers}
            userId={userId}
            onSuccess={() => setSheetOpen(false)}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={v => { if (!v) setDeleteId(null) }}
        title="Delete Client"
        description="Are you sure you want to delete this client? All related tasks and notes will also be removed."
        variant="destructive"
        confirmLabel="Delete Client"
        onConfirm={() => { if (deleteId) handleDelete(deleteId) }}
        isPending={isDeleting}
      />
    </>
  )
}
