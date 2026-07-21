'use client'

import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { cn } from '@/lib/utils'
import type { LabelData } from './TaskBoard'

const LABEL_COLORS = [
  '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7',
  '#3b82f6', '#14b8a6', '#ec4899', '#64748b', '#78350f',
]

interface BoardLabelManagerProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  boardId: string
  labels: LabelData[]
  onCreated: (label: LabelData) => void
  onDeleted: (labelId: string) => void
}

export function BoardLabelManager({ open, onOpenChange, boardId, labels, onCreated, onDeleted }: BoardLabelManagerProps) {
  const [name, setName] = React.useState('')
  const [color, setColor] = React.useState(LABEL_COLORS[0])
  const [isPending, setIsPending] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<LabelData | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    setIsPending(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('task_labels') as any)
      .insert({ board_id: boardId, name: trimmed, color })
      .select('id').single()
    setIsPending(false)
    if (error) { toast.error(error.message); return }
    onCreated({ id: data.id, name: trimmed, color })
    setName('')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('task_labels').delete().eq('id', deleteTarget.id)
    setIsDeleting(false)
    if (error) { toast.error(error.message); return }
    onDeleted(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Labels</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {labels.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No labels yet</p>
            )}
            {labels.map(l => (
              <div key={l.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm font-medium rounded-md px-2.5 py-1 text-white" style={{ backgroundColor: l.color }}>
                  {l.name}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(l)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Label name"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {LABEL_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-6 w-6 rounded-full border-2 transition-transform',
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Button size="sm" className="w-full gap-1.5" onClick={handleAdd} disabled={!name.trim() || isPending}>
              <Plus className="h-3.5 w-3.5" />
              Add Label
            </Button>
          </div>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
        title="Delete Label"
        description={`"${deleteTarget?.name}" will be removed from all cards.`}
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </Dialog>
  )
}
