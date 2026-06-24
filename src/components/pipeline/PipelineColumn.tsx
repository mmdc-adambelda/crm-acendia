'use client'

import * as React from 'react'
import { Droppable } from '@hello-pangea/dnd'
import type { LeadStatus } from '@/types'
import { PipelineCard, type PipelineLead } from './PipelineCard'

export type Column = {
  id: LeadStatus
  leads: PipelineLead[]
  totalValue: number
}

const COLUMN_CONFIG: Record<LeadStatus, { label: string; accent: string; dot: string }> = {
  'New':           { label: 'New',           accent: 'border-t-blue-500',    dot: 'bg-blue-500'    },
  'Contacted':     { label: 'Contacted',     accent: 'border-t-violet-500',  dot: 'bg-violet-500'  },
  'Qualified':     { label: 'Qualified',     accent: 'border-t-amber-500',   dot: 'bg-amber-500'   },
  'Proposal Sent': { label: 'Proposal Sent', accent: 'border-t-cyan-500',    dot: 'bg-cyan-500'    },
  'Negotiation':   { label: 'Negotiation',   accent: 'border-t-pink-500',    dot: 'bg-pink-500'    },
  'Won':           { label: 'Won',           accent: 'border-t-emerald-500', dot: 'bg-emerald-500' },
  'Lost':          { label: 'Lost',          accent: 'border-t-red-500',     dot: 'bg-red-500'     },
}

interface PipelineColumnProps {
  column: Column
}

export function PipelineColumn({ column }: PipelineColumnProps) {
  const config = COLUMN_CONFIG[column.id]

  return (
    <div className={`flex flex-col w-64 shrink-0 rounded-xl border-t-2 ${config.accent} bg-muted/30`}>
      {/* Column header */}
      <div className="px-3 py-2.5 border-b bg-background/60 rounded-t-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`h-2 w-2 rounded-full shrink-0 ${config.dot}`} />
            <span className="text-sm font-semibold truncate">{config.label}</span>
            <span className="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 shrink-0">
              {column.leads.length}
            </span>
          </div>
        </div>
        {column.totalValue > 0 && (
          <p className="text-xs text-muted-foreground mt-1 pl-4">
            ${column.totalValue.toLocaleString()}
          </p>
        )}
      </div>

      {/* Droppable area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px] transition-colors duration-150
              ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}
            `}
          >
            {column.leads.map((lead, index) => (
              <PipelineCard key={lead.id} lead={lead} index={index} />
            ))}
            {provided.placeholder}
            {column.leads.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-16 text-xs text-muted-foreground/50 border border-dashed border-border rounded-lg">
                No leads
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
