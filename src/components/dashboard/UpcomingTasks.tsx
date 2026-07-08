import Link from 'next/link'
import { CalendarDays, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PriorityBadge } from '@/components/shared/StatusBadge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { nzDateKey } from '@/lib/timezone'
import type { TaskPriority } from '@/types'

type DashboardTask = {
  id: string
  title: string
  due_date: string | null
  priority: string
  status: string
}

function dueDateColor(dueDate: string | null): string {
  if (!dueDate) return 'text-muted-foreground'
  const dueKey = nzDateKey(dueDate)
  const todayKey = nzDateKey(new Date())
  if (dueKey < todayKey) return 'text-red-500'
  if (dueKey === todayKey) return 'text-orange-500'
  return 'text-muted-foreground'
}

function dueDateLabel(dueDate: string | null): string {
  if (!dueDate) return ''
  const dueKey = nzDateKey(dueDate)
  const todayKey = nzDateKey(new Date())
  if (dueKey < todayKey) return `Overdue · ${formatDate(dueDate)}`
  if (dueKey === todayKey) return 'Due today'
  return formatDate(dueDate)
}

export function UpcomingTasks({ tasks }: { tasks: DashboardTask[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Upcoming Tasks
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
          <Link href="/tasks">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {tasks.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            No pending tasks
          </p>
        ) : (
          <div className="divide-y">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-6 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  {task.due_date && (
                    <div className={cn('flex items-center gap-1 mt-0.5', dueDateColor(task.due_date))}>
                      <CalendarDays className="h-3 w-3 shrink-0" />
                      <span className="text-xs">{dueDateLabel(task.due_date)}</span>
                    </div>
                  )}
                </div>
                <PriorityBadge priority={task.priority as TaskPriority} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
