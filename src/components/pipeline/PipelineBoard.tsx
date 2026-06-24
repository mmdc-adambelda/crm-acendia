'use client'

import * as React from 'react'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { PipelineColumn, type Column } from './PipelineColumn'
import type { LeadStatus } from '@/types'

interface PipelineBoardProps {
  initialColumns: Column[]
}

export function PipelineBoard({ initialColumns }: PipelineBoardProps) {
  const [columns, setColumns] = React.useState<Column[]>(initialColumns)

  async function updateLeadStatus(leadId: string, newStatus: LeadStatus, snapshot: Column[]) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('leads') as any).update({ status: newStatus }).eq('id', leadId)
    if (error) {
      toast.error(`Failed to move lead: ${error.message}`)
      setColumns(snapshot)
    }
  }

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const sourceStatus = source.droppableId as LeadStatus
    const destStatus = destination.droppableId as LeadStatus

    // Snapshot before mutating (used for revert on error)
    const snapshot = columns.map((col) => ({ ...col, leads: [...col.leads] }))

    setColumns((prev) => {
      const next = prev.map((col) => ({ ...col, leads: [...col.leads] }))
      const srcCol = next.find((c) => c.id === sourceStatus)!
      const dstCol = next.find((c) => c.id === destStatus)!

      const [movedLead] = srcCol.leads.splice(source.index, 1)
      dstCol.leads.splice(destination.index, 0, movedLead)

      if (sourceStatus !== destStatus) {
        srcCol.totalValue -= movedLead.deal_value ?? 0
        dstCol.totalValue += movedLead.deal_value ?? 0
      }

      return next
    })

    if (sourceStatus !== destStatus) {
      updateLeadStatus(draggableId, destStatus, snapshot)
    }
  }

  const totalLeads = columns.reduce((sum, col) => sum + col.leads.length, 0)
  const pipelineValue = columns
    .filter((c) => c.id !== 'Won' && c.id !== 'Lost')
    .reduce((sum, col) => sum + col.totalValue, 0)
  const wonValue = columns.find((c) => c.id === 'Won')?.totalValue ?? 0

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Summary bar */}
      <div className="flex items-center gap-6 text-sm flex-wrap">
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground">{totalLeads}</span> leads total
        </span>
        <span className="text-muted-foreground">
          Pipeline value:{' '}
          <span className="font-semibold text-foreground">${pipelineValue.toLocaleString()}</span>
        </span>
        <span className="text-muted-foreground">
          Won:{' '}
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            ${wonValue.toLocaleString()}
          </span>
        </span>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 16rem)' }}>
          {columns.map((column) => (
            <PipelineColumn key={column.id} column={column} />
          ))}
        </div>
      </DragDropContext>
    </div>
  )
}
