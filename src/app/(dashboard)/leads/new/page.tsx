import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New Lead' }

// Full implementation in Phase 5
export default function NewLeadPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">New Lead</h1>
      <p className="text-muted-foreground mt-1">Lead creation form — implemented in Phase 5.</p>
    </div>
  )
}
