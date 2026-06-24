import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Leads' }

// Full implementation in Phase 5
export default function LeadsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Leads</h1>
      <p className="text-muted-foreground mt-1">Lead table, filters and actions — implemented in Phase 5.</p>
    </div>
  )
}
