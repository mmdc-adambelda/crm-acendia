import { Badge } from '@/components/ui/badge'
import type { LeadStatus, TaskStatus, TaskPriority, CallOutcome, OnboardingStatus } from '@/types'

interface StatusBadgeProps {
  status: LeadStatus | TaskStatus | CallOutcome | OnboardingStatus
}

const leadStatusConfig: Record<
  LeadStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' }
> = {
  New: { label: 'New', variant: 'info' },
  Contacted: { label: 'Contacted', variant: 'purple' },
  Qualified: { label: 'Qualified', variant: 'warning' },
  'Proposal Sent': { label: 'Proposal Sent', variant: 'secondary' },
  Negotiation: { label: 'Negotiation', variant: 'default' },
  Won: { label: 'Won', variant: 'success' },
  Lost: { label: 'Lost', variant: 'destructive' },
}

const taskStatusConfig: Record<
  TaskStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' }
> = {
  Pending: { label: 'Pending', variant: 'secondary' },
  'In Progress': { label: 'In Progress', variant: 'info' },
  Done: { label: 'Done', variant: 'success' },
}

const callOutcomeConfig: Record<
  CallOutcome,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' }
> = {
  'No Answer': { label: 'No Answer', variant: 'secondary' },
  Interested: { label: 'Interested', variant: 'success' },
  'Not Interested': { label: 'Not Interested', variant: 'destructive' },
  Callback: { label: 'Callback', variant: 'warning' },
  'Booked Meeting': { label: 'Booked Meeting', variant: 'info' },
}

const onboardingStatusConfig: Record<
  OnboardingStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' }
> = {
  Pending: { label: 'Pending', variant: 'secondary' },
  'In Progress': { label: 'In Progress', variant: 'warning' },
  Completed: { label: 'Completed', variant: 'success' },
}

const allConfigs = {
  ...leadStatusConfig,
  ...taskStatusConfig,
  ...callOutcomeConfig,
  ...onboardingStatusConfig,
} as Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' }>

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = allConfigs[status] ?? { label: status, variant: 'secondary' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface PriorityBadgeProps {
  priority: TaskPriority
}

const priorityConfig: Record<
  TaskPriority,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' | 'purple' }
> = {
  Low: { label: 'Low', variant: 'outline' },
  Medium: { label: 'Medium', variant: 'secondary' },
  High: { label: 'High', variant: 'warning' },
  Urgent: { label: 'Urgent', variant: 'destructive' },
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = priorityConfig[priority] ?? { label: priority, variant: 'secondary' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface LeadScoreBadgeProps {
  score: number
}

export function LeadScoreBadge({ score }: LeadScoreBadgeProps) {
  const variant =
    score >= 70 ? 'success' : score >= 40 ? 'warning' : ('secondary' as const)
  return (
    <Badge variant={variant} className="tabular-nums">
      {score}
    </Badge>
  )
}
