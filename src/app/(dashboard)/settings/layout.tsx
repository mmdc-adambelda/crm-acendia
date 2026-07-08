import { createClient } from '@/lib/supabase/server'
import { SettingsNav } from '@/components/settings/SettingsNav'

export const dynamic = 'force-dynamic'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = user
    ? await (supabase as any).from('profiles').select('role').eq('id', user.id).single()
    : { data: null }

  const role = (profile as { role: string } | null)?.role ?? null
  const isAdmin = role === 'super_admin' || role === 'admin'

  return (
    <div className="space-y-5">
      <SettingsNav isAdmin={isAdmin} />
      {children}
    </div>
  )
}
