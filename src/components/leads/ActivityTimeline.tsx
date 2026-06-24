import {
  UserPlus,
  RefreshCw,
  ArrowRightLeft,
  StickyNote,
  Phone,
  CheckSquare,
  Mail,
  Calendar,
  Trophy,
  XCircle,
  Building2,
  type LucideIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import type { ActivityType } from '@/types'

const activityConfig: Record<
  ActivityType,
  { icon: LucideIcon; color: string; bg: string }
> = {
  lead_created: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  lead_updated: { icon: RefreshCw, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
  status_changed: { icon: ArrowRightLeft, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40' },
  note_added: { icon: StickyNote, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950/40' },
  call_logged: { icon: Phone, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/40' },
  task_created: { icon: CheckSquare, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950/40' },
  task_completed: { icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/40' },
  email_sent: { icon: Mail, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/40' },
  meeting_booked: { icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/40' },
  deal_won: { icon: Trophy, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/40' },
  deal_lost: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/40' },
  client_created: { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
}

type TimelineActivity = {
  id: string
  type: ActivityType
  description: string
  created_at: string
  creator: { full_name: string | null; avatar_url: string | null } | null
}

interface ActivityTimelineProps {
  activities: TimelineActivity[]
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (!activities.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No activity recorded yet
      </p>
    )
  }

  return (
    <ol className="relative space-y-0">
      {activities.map((activity, index) => {
        const config = activityConfig[activity.type] ?? {
          icon: RefreshCw,
          color: 'text-slate-600',
          bg: 'bg-slate-100',
        }
        const Icon = config.icon
        const isLast = index === activities.length - 1

        return (
          <li key={activity.id} className="flex gap-3">
            {/* Left: icon + connector line */}
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bg}`}
              >
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-border mt-1 mb-1" style={{ minHeight: '12px' }} />
              )}
            </div>

            {/* Right: content */}
            <div className={`pb-5 min-w-0 flex-1 ${isLast ? '' : ''}`}>
              <p className="text-sm leading-relaxed">{activity.description}</p>
              <div className="flex items-center gap-2 mt-1">
                {activity.creator && (
                  <div className="flex items-center gap-1">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={activity.creator.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[8px]">
                        {getInitials(activity.creator.full_name ?? '')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {activity.creator.full_name ?? 'System'}
                    </span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(activity.created_at)}
                </span>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
