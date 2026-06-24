import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Clients' }

// Full implementation in Phase 7
export default function ClientsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Clients</h1>
      <p className="text-muted-foreground mt-1">Active client management — implemented in Phase 7.</p>
    </div>
  )
}
