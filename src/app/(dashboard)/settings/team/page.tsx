import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Team Settings' }

// Full implementation in Phase 7
export default function TeamSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Team</h1>
      <p className="text-muted-foreground mt-1">Invite and manage team members and roles — implemented in Phase 7.</p>
    </div>
  )
}
