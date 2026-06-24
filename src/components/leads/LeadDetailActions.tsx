'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LeadForm } from './LeadForm'

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
}

type TeamMember = { id: string; full_name: string | null }

interface LeadDetailActionsProps {
  lead: LeadRow
  teamMembers: TeamMember[]
  userId: string
}

export function LeadDetailActions({ lead, teamMembers, userId }: LeadDetailActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('leads').delete().eq('id', lead.id)
    setIsDeleting(false)
    setDeleteOpen(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Lead deleted')
    router.push('/leads')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => setDeleteOpen(true)}
          title="Delete lead"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>Edit Lead</SheetTitle>
          </SheetHeader>
          <LeadForm
            lead={lead}
            teamMembers={teamMembers}
            userId={userId}
            onSuccess={() => {
              setEditOpen(false)
              router.refresh()
            }}
            onCancel={() => setEditOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Lead"
        description={`Are you sure you want to delete "${lead.company_name}"? All related data will be permanently removed.`}
        variant="destructive"
        confirmLabel="Delete Lead"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </>
  )
}
