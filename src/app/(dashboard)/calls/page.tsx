import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Call Logs' }

// Full implementation in Phase 7
export default function CallsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Call Logs</h1>
      <p className="text-muted-foreground mt-1">Outbound call logging — implemented in Phase 7.</p>
    </div>
  )
}
