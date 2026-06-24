import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Client Detail' }

// Full implementation in Phase 7
export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  void params
  return (
    <div>
      <h1 className="text-2xl font-bold">Client Detail</h1>
      <p className="text-muted-foreground mt-1">Client profile, notes, tasks — implemented in Phase 7.</p>
    </div>
  )
}
