'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  CheckSquare,
  Phone,
  Building2,
  Settings,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: Users,
  },
  {
    label: 'Pipeline',
    href: '/pipeline',
    icon: KanbanSquare,
  },
  {
    label: 'Tasks',
    href: '/tasks',
    icon: CheckSquare,
  },
  {
    label: 'Calls',
    href: '/calls',
    icon: Phone,
  },
  {
    label: 'Clients',
    href: '/clients',
    icon: Building2,
  },
]

const bottomItems = [
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex h-full w-64 flex-col border-r bg-sidebar">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 shadow-sm">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white leading-tight">Acendia CRM</span>
            <span className="text-[10px] text-green-400 font-medium uppercase tracking-wider leading-tight">
              Digital Growth
            </span>
          </div>
        </div>

        {/* Main nav */}
        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-1 px-3">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Main
            </p>
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        active
                          ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          active ? 'text-green-400' : 'text-slate-500 group-hover:text-white'
                        )}
                      />
                      {item.label}
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-400" />
                      )}
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="hidden">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Bottom section */}
        <div className="border-t border-sidebar-border px-3 py-4">
          <nav className="flex flex-col gap-1">
            {bottomItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-green-400' : 'text-slate-500 group-hover:text-white'
                    )}
                  />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>
    </TooltipProvider>
  )
}
