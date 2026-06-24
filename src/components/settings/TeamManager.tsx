'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { USER_ROLES } from '@/types'
import type { UserRole } from '@/types'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'

type TeamMember = {
  id: string
  email: string
  full_name: string | null
  role: string
  department: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

interface TeamManagerProps {
  members: TeamMember[]
  currentUserId: string
}

function getInitials(name: string | null, email: string) {
  if (name) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
  }
  return email[0].toUpperCase()
}

export function TeamManager({ members, currentUserId }: TeamManagerProps) {
  const router = useRouter()
  const [togglingId, setTogglingId] = React.useState<string | null>(null)

  async function handleToggleActive(member: TeamMember) {
    if (member.id === currentUserId) {
      toast.error('You cannot deactivate your own account')
      return
    }
    setTogglingId(member.id)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('profiles') as any)
      .update({ is_active: !member.is_active })
      .eq('id', member.id)
    setTogglingId(null)
    if (error) { toast.error(error.message); return }
    toast.success(`${member.full_name ?? member.email} ${member.is_active ? 'deactivated' : 'activated'}`)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Team Member</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden sm:table-cell">Role</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden md:table-cell">Department</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground hidden lg:table-cell">Phone</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map(member => {
              const roleName = USER_ROLES.find(r => r.value === member.role)?.label ?? member.role
              const isCurrentUser = member.id === currentUserId
              return (
                <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                  {/* Name + email */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {getInitials(member.full_name, member.email)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {member.full_name ?? '—'}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-xs text-muted-foreground font-normal">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant={
                      member.role === 'super_admin' || member.role === 'admin'
                        ? 'default'
                        : 'secondary'
                    } className="text-xs">
                      {roleName}
                    </Badge>
                  </td>

                  {/* Department */}
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-muted-foreground">
                    {member.department ?? '—'}
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                    {member.phone ?? '—'}
                  </td>

                  {/* Active toggle */}
                  <td className="px-4 py-3">
                    <Switch
                      checked={member.is_active}
                      onCheckedChange={() => handleToggleActive(member)}
                      disabled={togglingId === member.id || isCurrentUser}
                      title={isCurrentUser ? 'You cannot deactivate yourself' : undefined}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        To invite new team members, they need to sign up and be approved. Contact your Supabase administrator.
      </p>
    </div>
  )
}
