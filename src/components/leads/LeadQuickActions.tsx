'use client'

import * as React from 'react'
import { Phone, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { LogCallDialog } from './LogCallDialog'
import { TaskForm } from '@/components/tasks/TaskForm'

type TeamMember = { id: string; full_name: string | null; avatar_url?: string | null }

interface LeadQuickActionsProps {
  leadId: string
  leadName: string
  userId: string
  teamMembers: TeamMember[]
}

export function LeadQuickActions({ leadId, leadName, userId, teamMembers }: LeadQuickActionsProps) {
  const [callOpen, setCallOpen] = React.useState(false)
  const [taskOpen, setTaskOpen] = React.useState(false)

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCallOpen(true)}>
        <Phone className="h-3.5 w-3.5" />
        Log Call
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTaskOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Add Task
      </Button>

      <LogCallDialog
        open={callOpen}
        onOpenChange={setCallOpen}
        leadId={leadId}
        leadName={leadName}
        userId={userId}
      />

      <Sheet open={taskOpen} onOpenChange={setTaskOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col p-0 gap-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>Add Task — {leadName}</SheetTitle>
          </SheetHeader>
          <TaskForm
            task={null}
            leads={[{ id: leadId, company_name: leadName }]}
            teamMembers={teamMembers}
            userId={userId}
            defaultLeadId={leadId}
            onSuccess={() => setTaskOpen(false)}
            onCancel={() => setTaskOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
