'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  CheckSquare,
  Phone,
  Building2,
  Settings,
  Kanban,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const allNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: null },
  { label: 'Leads',     href: '/leads',     icon: Users,           roles: null },
  { label: 'Pipeline',  href: '/pipeline',  icon: KanbanSquare,    roles: null },
  { label: 'Tasks',     href: '/tasks',     icon: CheckSquare,     roles: null },
  { label: 'My Tasks',  href: '/my-tasks',  icon: Kanban,          roles: null },
  { label: 'Calls',     href: '/calls',     icon: Phone,           roles: ['super_admin', 'admin', 'bdm', 'operations_manager', 'client_success_manager'] },
  { label: 'Clients',   href: '/clients',   icon: Building2,       roles: null },
]

const bottomItems = [
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  userRole?: string | null
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  const navItems = allNavItems.filter(item =>
    item.roles === null || (userRole && item.roles.includes(userRole))
  )

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex h-full w-64 flex-col border-r bg-sidebar">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <Image
            src="/acendia-logo.svg"
            alt="Acendia"
            width={32}
            height={32}
            className="rounded-md shrink-0"
          />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white leading-tight">Acendia CRM</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-tight">
              Digital Growth
            </span>
          </div>
        </div>

        {/* Main nav */}
        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-1 px-3">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-600">
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
                          ? 'bg-white/10 text-white border border-white/15'
                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0 transition-colors',
                          active ? 'text-white' : 'text-gray-500 group-hover:text-white'
                        )}
                      />
                      {item.label}
                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
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
                      ? 'bg-white/10 text-white border border-white/15'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-white' : 'text-gray-500 group-hover:text-white'
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
