import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Tasks' }

// Full implementation in Phase 7
export default function TasksPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Tasks</h1>
      <p className="text-muted-foreground mt-1">Task management — implemented in Phase 7.</p>
    </div>
  )
}
