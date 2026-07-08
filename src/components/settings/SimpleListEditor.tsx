'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

type ListItem = { id: string; name: string; position: number }

interface SimpleListEditorProps {
  table: string
  title: string
  items: ListItem[]
  addPlaceholder: string
  emptyText: string
  itemLabel: string
}

export function SimpleListEditor({ table, title, items, addPlaceholder, emptyText, itemLabel }: SimpleListEditorProps) {
  const router = useRouter()
  const [newName, setNewName] = React.useState('')
  const [adding, setAdding] = React.useState(false)
  const [deleteItem, setDeleteItem] = React.useState<ListItem | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function move(index: number, direction: -1 | 1) {
    const a = items[index]
    const b = items[index + direction]
    if (!a || !b) return
    setBusyId(a.id)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const from = supabase.from(table) as any
    await Promise.all([
      from.update({ position: b.position }).eq('id', a.id),
      from.update({ position: a.position }).eq('id', b.id),
    ])
    setBusyId(null)
    router.refresh()
  }

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    const supabase = createClient()
    const position = items.length ? Math.max(...items.map(i => i.position)) + 1 : 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(table) as any).insert({ name, position })
    setAdding(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Added "${name}"`)
    setNewName('')
    router.refresh()
  }

  async function handleDelete() {
    if (!deleteItem) return
    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from(table).delete().eq('id', deleteItem.id)
    setIsDeleting(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Removed "${deleteItem.name}"`)
    setDeleteItem(null)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border divide-y">
          {items.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          )}
          {items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-2 px-4 py-2.5">
              <span className="flex-1 text-sm font-medium">{item.name}</span>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                disabled={index === 0 || busyId === item.id}
                onClick={() => move(index, -1)}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-7 w-7"
                disabled={index === items.length - 1 || busyId === item.id}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => setDeleteItem(item)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={addPlaceholder}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          />
          <Button onClick={handleAdd} disabled={!newName.trim() || adding} className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(v) => { if (!v) setDeleteItem(null) }}
        title={`Remove ${itemLabel}`}
        description={`"${deleteItem?.name}" will no longer appear as an option. Leads already using it keep their existing value.`}
        variant="destructive"
        confirmLabel="Remove"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </Card>
  )
}
