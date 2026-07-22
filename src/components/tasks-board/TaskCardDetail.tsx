'use client'

import * as React from 'react'
import { Trash2, X, Plus, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { formatNzDateTime } from '@/lib/timezone'
import { cn } from '@/lib/utils'
import type { CardData, LabelData } from './TaskBoard'

type ChecklistItem = { id: string; text: string; is_done: boolean; position: number }
type Comment = { id: string; body: string; created_at: string }

interface TaskCardDetailProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  card: CardData
  listId: string
  lists: { id: string; name: string }[]
  labels: LabelData[]
  onUpdated: (updated: Partial<CardData> & { id: string }) => void
  onDeleted: () => void
  onMoved: (toListId: string) => void
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function TaskCardDetail({ open, onOpenChange, card, listId, lists, labels, onUpdated, onDeleted, onMoved }: TaskCardDetailProps) {
  const [title, setTitle] = React.useState(card.title)
  const [description, setDescription] = React.useState(card.description ?? '')
  const [dueDateInput, setDueDateInput] = React.useState(toDatetimeLocalValue(card.due_date))
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>([])
  const [newChecklistText, setNewChecklistText] = React.useState('')
  const [comments, setComments] = React.useState<Comment[]>([])
  const [newComment, setNewComment] = React.useState('')
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    setTitle(card.title)
    setDescription(card.description ?? '')
    setDueDateInput(toDatetimeLocalValue(card.due_date))
  }, [card.id, card.title, card.description, card.due_date])

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const [{ data: items }, { data: cmts }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('task_checklist_items') as any).select('id, text, is_done, position').eq('card_id', card.id).order('position'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from('task_card_comments') as any).select('id, body, created_at').eq('card_id', card.id).order('created_at'),
      ])
      if (!cancelled) {
        setChecklist((items ?? []) as ChecklistItem[])
        setComments((cmts ?? []) as Comment[])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [card.id])

  async function saveTitle() {
    const trimmed = title.trim()
    if (!trimmed || trimmed === card.title) { setTitle(card.title); return }
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('task_cards') as any).update({ title: trimmed }).eq('id', card.id)
    if (error) { toast.error(error.message); setTitle(card.title); return }
    onUpdated({ id: card.id, title: trimmed })
  }

  async function saveDescription() {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('task_cards') as any)
      .update({ description: description.trim() || null }).eq('id', card.id)
    if (error) { toast.error(error.message); return }
    onUpdated({ id: card.id, description: description.trim() || null })
  }

  async function saveDueDate(value: string) {
    setDueDateInput(value)
    const supabase = createClient()
    const iso = value ? new Date(value).toISOString() : null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('task_cards') as any).update({ due_date: iso }).eq('id', card.id)
    if (error) { toast.error(error.message); return }
    onUpdated({ id: card.id, due_date: iso })
  }

  async function toggleLabel(labelId: string) {
    const supabase = createClient()
    const has = card.labelIds.includes(labelId)
    if (has) {
      const { error } = await supabase.from('task_card_labels').delete().eq('card_id', card.id).eq('label_id', labelId)
      if (error) { toast.error(error.message); return }
      onUpdated({ id: card.id, labelIds: card.labelIds.filter(id => id !== labelId) })
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('task_card_labels') as any).insert({ card_id: card.id, label_id: labelId })
      if (error) { toast.error(error.message); return }
      onUpdated({ id: card.id, labelIds: [...card.labelIds, labelId] })
    }
  }

  async function addChecklistItem() {
    const text = newChecklistText.trim()
    if (!text) return
    const supabase = createClient()
    const position = checklist.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('task_checklist_items') as any)
      .insert({ card_id: card.id, text, position }).select('id').single()
    if (error) { toast.error(error.message); return }
    const next = [...checklist, { id: data.id, text, is_done: false, position }]
    setChecklist(next)
    onUpdated({ id: card.id, checklistTotal: next.length, checklistDone: next.filter(i => i.is_done).length })
    setNewChecklistText('')
  }

  async function toggleChecklistItem(item: ChecklistItem) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('task_checklist_items') as any)
      .update({ is_done: !item.is_done }).eq('id', item.id)
    if (error) { toast.error(error.message); return }
    const next = checklist.map(i => (i.id === item.id ? { ...i, is_done: !i.is_done } : i))
    setChecklist(next)
    onUpdated({ id: card.id, checklistTotal: next.length, checklistDone: next.filter(i => i.is_done).length })
  }

  async function deleteChecklistItem(item: ChecklistItem) {
    const supabase = createClient()
    const { error } = await supabase.from('task_checklist_items').delete().eq('id', item.id)
    if (error) { toast.error(error.message); return }
    const next = checklist.filter(i => i.id !== item.id)
    setChecklist(next)
    onUpdated({ id: card.id, checklistTotal: next.length, checklistDone: next.filter(i => i.is_done).length })
  }

  async function addComment() {
    const body = newComment.trim()
    if (!body) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('task_card_comments') as any)
      .insert({ card_id: card.id, author_id: user.id, body })
      .select('id, created_at').single()
    if (error) { toast.error(error.message); return }
    setComments(prev => [...prev, { id: data.id, body, created_at: data.created_at }])
    setNewComment('')
  }

  async function handleDelete() {
    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('task_cards').delete().eq('id', card.id)
    setIsDeleting(false)
    if (error) { toast.error(error.message); return }
    onDeleted()
  }

  const checklistProgress = checklist.length > 0 ? (checklist.filter(i => i.is_done).length / checklist.length) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }}
            className="text-base font-semibold border-0 px-0 h-auto focus-visible:ring-0 shadow-none"
          />
        </DialogHeader>

        <div className="space-y-5">
          {/* List — move the card without dragging */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">List</p>
            <Select value={listId} onValueChange={onMoved}>
              <SelectTrigger className="w-56 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {lists.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Labels</p>
              <div className="flex flex-wrap gap-1.5">
                {labels.map(l => {
                  const active = card.labelIds.includes(l.id)
                  return (
                    <button
                      key={l.id}
                      onClick={() => toggleLabel(l.id)}
                      className={cn(
                        'text-xs font-medium rounded-md px-2.5 py-1 transition-opacity',
                        active ? 'text-white' : 'text-foreground/70 opacity-50 hover:opacity-80'
                      )}
                      style={{ backgroundColor: active ? l.color : `${l.color}33` }}
                    >
                      {l.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Due date */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</p>
            <div className="flex items-center gap-2">
              <Input
                type="datetime-local"
                value={dueDateInput}
                onChange={(e) => saveDueDate(e.target.value)}
                className="w-56 h-8 text-sm"
              />
              {dueDateInput && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveDueDate('')}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Add a more detailed description…"
              rows={3}
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Checklist</p>
              {checklist.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {checklist.filter(i => i.is_done).length}/{checklist.length}
                </span>
              )}
            </div>
            {checklist.length > 0 && <Progress value={checklistProgress} className="h-1.5" />}
            <div className="space-y-1">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <Checkbox checked={item.is_done} onCheckedChange={() => toggleChecklistItem(item)} />
                  <span className={cn('text-sm flex-1', item.is_done && 'line-through text-muted-foreground')}>
                    {item.text}
                  </span>
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={() => deleteChecklistItem(item)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                placeholder="Add an item…"
                className="h-8 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem() } }}
              />
              <Button size="sm" variant="outline" className="h-8 gap-1 shrink-0" onClick={addChecklistItem}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Comments
            </p>
            {!loading && comments.length > 0 && (
              <div className="space-y-2">
                {comments.map(c => (
                  <div key={c.id} className="rounded-md bg-muted/50 px-3 py-2">
                    <p className="text-sm whitespace-pre-wrap">{c.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{formatNzDateTime(c.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-start gap-1.5">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment…"
                rows={2}
                className="text-sm"
              />
            </div>
            <Button size="sm" onClick={addComment} disabled={!newComment.trim()}>Comment</Button>
          </div>

          {/* Delete */}
          <div className="pt-2 border-t">
            <Button
              variant="outline" size="sm"
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Card
            </Button>
          </div>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Card"
        description={`"${card.title}" will be permanently deleted, including its checklist and comments.`}
        variant="destructive"
        confirmLabel="Delete Card"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </Dialog>
  )
}
