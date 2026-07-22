'use client'

import * as React from 'react'
import { Draggable, type DraggableProvidedDragHandleProps } from '@hello-pangea/dnd'
import { StrictModeDroppable } from './StrictModeDroppable'
import { MoreHorizontal, Plus, Trash2, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { TaskCard } from './TaskCard'
import type { ListData, LabelData, CardData } from './TaskBoard'

interface TaskListProps {
  list: ListData
  labels: LabelData[]
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined
  onOpenCard: (cardId: string) => void
  onRenamed: (listId: string, name: string) => void
  onDeleted: (listId: string) => void
  onCardAdded: (listId: string, card: CardData) => void
}

export function TaskList({ list, labels, dragHandleProps, onOpenCard, onRenamed, onDeleted, onCardAdded }: TaskListProps) {
  const [editingName, setEditingName] = React.useState(false)
  const [nameInput, setNameInput] = React.useState(list.name)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [addingCard, setAddingCard] = React.useState(false)
  const [newCardTitle, setNewCardTitle] = React.useState('')
  const [isSavingCard, setIsSavingCard] = React.useState(false)

  async function saveRename() {
    const trimmed = nameInput.trim()
    setEditingName(false)
    if (!trimmed || trimmed === list.name) { setNameInput(list.name); return }
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('task_lists') as any).update({ name: trimmed }).eq('id', list.id)
    if (error) { toast.error(error.message); setNameInput(list.name); return }
    onRenamed(list.id, trimmed)
  }

  async function handleDelete() {
    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('task_lists').delete().eq('id', list.id)
    setIsDeleting(false)
    setDeleteOpen(false)
    if (error) { toast.error(error.message); return }
    onDeleted(list.id)
  }

  async function handleAddCard() {
    const title = newCardTitle.trim()
    if (!title) return
    setIsSavingCard(true)
    const supabase = createClient()
    const position = list.cards.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('task_cards') as any)
      .insert({ list_id: list.id, title, position })
      .select('id')
      .single()
    setIsSavingCard(false)
    if (error) { toast.error(error.message); return }
    onCardAdded(list.id, {
      id: data.id, title, description: null, due_date: null, position,
      labelIds: [], checklistTotal: 0, checklistDone: 0,
    })
    setNewCardTitle('')
  }

  return (
    <div className="w-72 shrink-0 rounded-xl border bg-muted/30 flex flex-col max-h-full">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-b" {...dragHandleProps}>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 cursor-grab" />
        {editingName ? (
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveRename() } }}
            autoFocus
            className="h-7 text-sm font-semibold px-1.5"
          />
        ) : (
          <button
            className="flex-1 text-left text-sm font-semibold truncate px-1"
            onClick={() => setEditingName(true)}
          >
            {list.name}
          </button>
        )}
        <span className="text-xs text-muted-foreground shrink-0">{list.cards.length}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive cursor-pointer"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete List
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <StrictModeDroppable droppableId={list.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-2 space-y-2 min-h-[2rem] transition-colors ${
              snapshot.isDraggingOver ? 'bg-muted/60' : ''
            }`}
          >
            {list.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    {...(dragProvided.draggableProps as any)}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    {...(dragProvided.dragHandleProps as any)}
                  >
                    <TaskCard card={card} labels={labels} isDragging={dragSnapshot.isDragging} onClick={() => onOpenCard(card.id)} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </StrictModeDroppable>

      {/* Add card */}
      <div className="p-2 border-t">
        {addingCard ? (
          <div className="space-y-1.5">
            <Input
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Enter a title for this card…"
              autoFocus
              className="h-8 text-sm"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCard() } }}
            />
            <div className="flex items-center gap-1.5">
              <Button size="sm" className="h-7 text-xs" onClick={handleAddCard} disabled={isSavingCard}>Add</Button>
              <Button
                size="sm" variant="ghost" className="h-7 text-xs"
                onClick={() => { setAddingCard(false); setNewCardTitle('') }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost" size="sm"
            className="w-full justify-start gap-1.5 text-muted-foreground h-8 text-xs"
            onClick={() => setAddingCard(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add a card
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete List"
        description={`"${list.name}" and all ${list.cards.length} card${list.cards.length !== 1 ? 's' : ''} in it will be permanently deleted.`}
        variant="destructive"
        confirmLabel="Delete List"
        onConfirm={handleDelete}
        isPending={isDeleting}
      />
    </div>
  )
}
