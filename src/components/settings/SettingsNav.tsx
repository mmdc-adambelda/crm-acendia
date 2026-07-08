'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SettingsNavProps {
  isAdmin: boolean
}

export function SettingsNav({ isAdmin }: SettingsNavProps) {
  const pathname = usePathname()

  const tabs = [
    { label: 'Profile', href: '/settings/profile', show: true },
    { label: 'Team', href: '/settings/team', show: isAdmin },
    { label: 'Lead Fields', href: '/settings/lead-fields', show: isAdmin },
  ].filter(t => t.show)

  return (
    <div className="border-b flex gap-1">
      {tabs.map(tab => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              active
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
