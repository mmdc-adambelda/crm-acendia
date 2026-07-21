'use client'

import { Calendar, CheckSquare } from 'lucide-react'
import { isNzToday, isNzPast, formatNzShortDate } from '@/lib/timezone'
import { cn } from '@/lib/utils'
import type { CardData, LabelData } from './TaskBoard'

interface TaskCardProps {
  card: CardData
  labels: LabelData[]
  isDragging: boolean
  onClick: () => void
}

export function TaskCard({ card, labels, isDragging, onClick }: TaskCardProps) {
  const cardLabels = labels.filter(l => card.labelIds.includes(l.id))

  const dueColor = card.due_date
    ? isNzPast(card.due_date)
      ? 'text-red-600 bg-red-50 dark:bg-red-950/30'
      : isNzToday(card.due_date)
      ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30'
      : 'text-muted-foreground bg-muted'
    : ''

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border bg-background p-2.5 space-y-1.5 shadow-sm hover:shadow transition-shadow',
        isDragging && 'shadow-lg rotate-1'
      )}
    >
      {cardLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {cardLabels.map(l => (
            <span
              key={l.id}
              className="h-1.5 w-6 rounded-full"
              style={{ backgroundColor: l.color }}
              title={l.name}
            />
          ))}
        </div>
      )}

      <p className="text-sm font-medium leading-snug break-words">{card.title}</p>

      {(card.due_date || card.checklistTotal > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          {card.due_date && (
            <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium', dueColor)}>
              <Calendar className="h-3 w-3" />
              {formatNzShortDate(card.due_date)}
            </span>
          )}
          {card.checklistTotal > 0 && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium',
              card.checklistDone === card.checklistTotal ? 'text-green-600 bg-green-50 dark:bg-green-950/30' : 'text-muted-foreground bg-muted'
            )}>
              <CheckSquare className="h-3 w-3" />
              {card.checklistDone}/{card.checklistTotal}
            </span>
          )}
        </div>
      )}
    </button>
  )
}
