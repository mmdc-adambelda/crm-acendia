import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

// Full implementation in Phase 4
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-1">KPIs and charts — implemented in Phase 4.</p>
    </div>
  )
}
