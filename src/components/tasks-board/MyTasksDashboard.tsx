'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LayoutGrid, Calendar, AlertTriangle, ListChecks, Plus, Kanban } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { KPICard } from '@/components/dashboard/KPICard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'

const BOARD_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Slate', value: '#64748b' },
]

type BoardSummary = { id: string; name: string; color: string | null; listCount: number; cardCount: number }
type Stats = { boardCount: number; totalCards: number; dueToday: number; overdue: number }

interface MyTasksDashboardProps {
  boards: BoardSummary[]
  stats: Stats
}

export function MyTasksDashboard({ boards, stats }: MyTasksDashboardProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [color, setColor] = React.useState(BOARD_COLORS[0].value)
  const [isPending, setIsPending] = React.useState(false)

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    setIsPending(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsPending(false); return }

    const position = boards.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('task_boards') as any)
      .insert({ owner_id: user.id, name: trimmed, color, position })
      .select('id')
      .single()

    setIsPending(false)
    if (error) { toast.error(error.message); return }

    toast.success(`Board "${trimmed}" created`)
    setOpen(false)
    setName('')
    router.push(`/my-tasks/${data.id}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Tasks</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Your own boards for personal daily task tracking — private to you
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Board
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <KPICard title="Boards" value={stats.boardCount} icon={LayoutGrid} color="blue" />
        <KPICard title="Total Cards" value={stats.totalCards} icon={ListChecks} color="purple" />
        <KPICard title="Due Today" value={stats.dueToday} icon={Calendar} color="orange" />
        <KPICard title="Overdue" value={stats.overdue} icon={AlertTriangle} color="red" />
      </div>

      {/* Boards grid */}
      {boards.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={Kanban}
              title="No boards yet"
              description="Create your first board to start tracking your daily tasks."
              action={{ label: 'New Board', onClick: () => setOpen(true) }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map(board => (
            <Link key={board.id} href={`/my-tasks/${board.id}`}>
              <Card className="h-28 overflow-hidden border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: board.color ?? '#64748b' }}>
                <CardContent className="p-4 h-full flex flex-col justify-between">
                  <p className="font-semibold truncate">{board.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {board.listCount} list{board.listCount !== 1 ? 's' : ''} · {board.cardCount} card{board.cardCount !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* New board dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setName('') }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Daily Tasks"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreate() } }}
            />
            <div className="flex items-center gap-2">
              {BOARD_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-transform',
                    color === c.value ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || isPending}>
              {isPending ? 'Creating…' : 'Create Board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
