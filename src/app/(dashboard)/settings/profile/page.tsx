import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profile Settings' }

// Full implementation in Phase 7
export default function ProfileSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Profile Settings</h1>
      <p className="text-muted-foreground mt-1">Update your name, avatar, and password — implemented in Phase 7.</p>
    </div>
  )
}
