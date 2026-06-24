import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Pipeline' }

// Full implementation in Phase 6
export default function PipelinePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Pipeline</h1>
      <p className="text-muted-foreground mt-1">Kanban drag-and-drop board — implemented in Phase 6.</p>
    </div>
  )
}
