import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Lead Detail' }

// Full implementation in Phase 5
export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  void params
  return (
    <div>
      <h1 className="text-2xl font-bold">Lead Detail</h1>
      <p className="text-muted-foreground mt-1">Lead profile, activity timeline, notes — implemented in Phase 5.</p>
    </div>
  )
}
