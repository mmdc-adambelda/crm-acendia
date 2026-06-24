import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Profile Settings' }
export const dynamic = 'force-dynamic'

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawProfile } = await (supabase as any)
    .from('profiles')
    .select('id, email, full_name, phone, department, role')
    .eq('id', user.id)
    .single()

  type ProfileData = { id: string; email: string; full_name: string | null; phone: string | null; department: string | null; role: string }
  const profile = rawProfile as ProfileData | null
  if (!profile) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Update your personal information and password
        </p>
      </div>
      <ProfileForm profile={{ ...profile, email: user.email ?? profile.email }} />
    </div>
  )
}
