import { type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const colorMap = {
  blue: {
    icon: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
    accent: 'border-l-blue-500',
  },
  purple: {
    icon: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
    accent: 'border-l-purple-500',
  },
  green: {
    icon: 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400',
    accent: 'border-l-green-500',
  },
  red: {
    icon: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
    accent: 'border-l-red-500',
  },
  orange: {
    icon: 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400',
    accent: 'border-l-orange-500',
  },
}

interface KPICardProps {
  title: string
  value: number | string
  icon: LucideIcon
  color: keyof typeof colorMap
  description?: string
}

export function KPICard({ title, value, icon: Icon, color, description }: KPICardProps) {
  return (
    <Card className={cn('border-l-4 overflow-hidden', colorMap[color].accent)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn('rounded-lg p-2.5 shrink-0 ml-3', colorMap[color].icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
