'use client'

import * as React from 'react'
import Link from 'next/link'
import { Draggable } from '@hello-pangea/dnd'
import { Building2, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type PipelineLead = {
  id: string
  company_name: string
  contact_person: string
  deal_value: number | null
  lead_score: number
  probability: number | null
  source: string
  assigned_to: string | null
  assignee: { full_name: string | null; avatar_url: string | null } | null
}

interface PipelineCardProps {
  lead: PipelineLead
  index: number
}

function getScoreColor(score: number) {
  if (score >= 80) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  if (score >= 60) return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
  if (score >= 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
  return 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300'
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function PipelineCard({ lead, index }: PipelineCardProps) {
  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={provided.draggableProps.style as React.CSSProperties}
          className={`
            group rounded-lg border bg-card text-card-foreground shadow-sm select-none
            transition-shadow duration-150
            ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/30 rotate-[1deg]' : 'hover:shadow-md'}
          `}
        >
          <Link href={`/leads/${lead.id}`} className="block p-3 space-y-2.5" onClick={(e) => { if (snapshot.isDragging) e.preventDefault() }}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight truncate">{lead.company_name}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                  <Building2 className="h-2.5 w-2.5 shrink-0" />
                  {lead.contact_person}
                </p>
              </div>
              {/* Lead score */}
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${getScoreColor(lead.lead_score)}`}>
                {lead.lead_score}
              </span>
            </div>

            {/* Deal value + probability */}
            {(lead.deal_value || lead.probability) && (
              <div className="flex items-center gap-2 text-xs">
                {lead.deal_value && (
                  <span className="font-semibold text-foreground">
                    ${lead.deal_value.toLocaleString()}
                  </span>
                )}
                {lead.probability !== null && (
                  <span className="text-muted-foreground flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" />
                    {lead.probability}%
                  </span>
                )}
              </div>
            )}

            {/* Footer: source badge + assignee */}
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal truncate max-w-[120px]">
                {lead.source}
              </Badge>

              {lead.assignee && (
                <div
                  className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold shrink-0 overflow-hidden"
                  title={lead.assignee.full_name ?? ''}
                >
                  {lead.assignee.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lead.assignee.avatar_url} alt={lead.assignee.full_name ?? ''} className="h-full w-full object-cover" />
                  ) : (
                    getInitials(lead.assignee.full_name)
                  )}
                </div>
              )}
            </div>
          </Link>
        </div>
      )}
    </Draggable>
  )
}
