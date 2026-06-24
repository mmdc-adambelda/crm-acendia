import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { TeamManager } from '@/components/settings/TeamManager'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Team Settings' }
export const dynamic = 'force-dynamic'

export default async function TeamSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [profileResult, membersResult] = await Promise.all([
    sb.from('profiles').select('role').eq('id', user.id).single(),
    sb.from('profiles')
      .select('id, email, full_name, role, department, phone, is_active, created_at')
      .order('created_at'),
  ])

  // Restrict to admin roles
  const role = (profileResult as { data: { role: string } | null }).data?.role
  if (role !== 'super_admin' && role !== 'admin') {
    notFound()
  }

  type MemberRow = { id: string; email: string; full_name: string | null; role: string; department: string | null; phone: string | null; is_active: boolean; created_at: string }
  const members = ((membersResult as { data: unknown[] | null }).data ?? []) as MemberRow[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage team members and access
        </p>
      </div>
      <TeamManager members={members} currentUserId={user.id} />
    </div>
  )
}
