'use client'

import * as React from 'react'
import Link from 'next/link'
import { DragDropContext, Draggable, type DropResult } from '@hello-pangea/dnd'
import { StrictModeDroppable } from './StrictModeDroppable'
import { ArrowLeft, Plus, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TaskList } from './TaskList'
import { TaskCardDetail } from './TaskCardDetail'
import { BoardLabelManager } from './BoardLabelManager'

export type CardData = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  position: number
  labelIds: string[]
  checklistTotal: number
  checklistDone: number
}

export type ListData = {
  id: string
  name: string
  position: number
  cards: CardData[]
}

export type LabelData = { id: string; name: string; color: string }

interface TaskBoardProps {
  board: { id: string; name: string; color: string | null }
  initialLists: ListData[]
  initialLabels: LabelData[]
}

export function TaskBoard({ board, initialLists, initialLabels }: TaskBoardProps) {
  const [lists, setLists] = React.useState<ListData[]>(initialLists)
  const [labels, setLabels] = React.useState<LabelData[]>(initialLabels)
  const [newListName, setNewListName] = React.useState('')
  const [addingList, setAddingList] = React.useState(false)
  const [activeCardId, setActiveCardId] = React.useState<string | null>(null)
  const [labelManagerOpen, setLabelManagerOpen] = React.useState(false)

  const activeCard = React.useMemo(() => {
    for (const list of lists) {
      const card = list.cards.find(c => c.id === activeCardId)
      if (card) return { card, listId: list.id }
    }
    return null
  }, [lists, activeCardId])

  async function persistListPositions(ordered: ListData[]) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const from = supabase.from('task_lists') as any
    const results = await Promise.all(ordered.map((l, i) => from.update({ position: i }).eq('id', l.id)))
    return results.every(r => !r.error)
  }

  async function persistCardPositions(listId: string, ordered: CardData[]) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const from = supabase.from('task_cards') as any
    const results = await Promise.all(
      ordered.map((c, i) => from.update({ position: i, list_id: listId }).eq('id', c.id))
    )
    return results.every(r => !r.error)
  }

  async function handleDragEnd(result: DropResult) {
    const { source, destination, type, draggableId } = result
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    if (type === 'LIST') {
      const snapshot = lists
      const next = [...lists]
      const [moved] = next.splice(source.index, 1)
      next.splice(destination.index, 0, moved)
      setLists(next)
      const ok = await persistListPositions(next)
      if (!ok) { toast.error('Failed to reorder lists'); setLists(snapshot) }
      return
    }

    // Card drag
    const snapshot = lists.map(l => ({ ...l, cards: [...l.cards] }))
    const srcListId = source.droppableId
    const dstListId = destination.droppableId

    let movedCard: CardData | null = null
    const next = lists.map(l => ({ ...l, cards: [...l.cards] }))
    const srcList = next.find(l => l.id === srcListId)
    const dstList = next.find(l => l.id === dstListId)
    if (!srcList || !dstList) return

    ;[movedCard] = srcList.cards.splice(source.index, 1)
    if (!movedCard) return
    dstList.cards.splice(destination.index, 0, movedCard)

    setLists(next)

    const okDst = await persistCardPositions(dstListId, dstList.cards)
    const okSrc = srcListId !== dstListId ? await persistCardPositions(srcListId, srcList.cards) : true

    if (!okDst || !okSrc) {
      toast.error('Failed to move card')
      setLists(snapshot)
    }
  }

  async function handleAddList() {
    const name = newListName.trim()
    if (!name) return
    setAddingList(true)
    const supabase = createClient()
    const position = lists.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('task_lists') as any)
      .insert({ board_id: board.id, name, position })
      .select('id')
      .single()
    setAddingList(false)
    if (error) { toast.error(error.message); return }
    setLists(prev => [...prev, { id: data.id, name, position, cards: [] }])
    setNewListName('')
  }

  function handleListRenamed(listId: string, name: string) {
    setLists(prev => prev.map(l => (l.id === listId ? { ...l, name } : l)))
  }

  function handleListDeleted(listId: string) {
    setLists(prev => prev.filter(l => l.id !== listId))
  }

  function handleCardAdded(listId: string, card: CardData) {
    setLists(prev => prev.map(l => (l.id === listId ? { ...l, cards: [...l.cards, card] } : l)))
  }

  function handleCardUpdated(listId: string, updated: Partial<CardData> & { id: string }) {
    setLists(prev => prev.map(l => {
      if (l.id !== listId) return l
      return { ...l, cards: l.cards.map(c => (c.id === updated.id ? { ...c, ...updated } : c)) }
    }))
  }

  function handleCardDeleted(listId: string, cardId: string) {
    setLists(prev => prev.map(l => (l.id === listId ? { ...l, cards: l.cards.filter(c => c.id !== cardId) } : l)))
    if (activeCardId === cardId) setActiveCardId(null)
  }

  function handleLabelCreated(label: LabelData) {
    setLabels(prev => [...prev, label])
  }

  function handleLabelDeleted(labelId: string) {
    setLabels(prev => prev.filter(l => l.id !== labelId))
    setLists(prev => prev.map(l => ({
      ...l,
      cards: l.cards.map(c => ({ ...c, labelIds: c.labelIds.filter(id => id !== labelId) })),
    })))
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/my-tasks"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            My Tasks
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: board.color ?? '#64748b' }} />
            {board.name}
          </h1>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setLabelManagerOpen(true)}>
          <Tag className="h-3.5 w-3.5" />
          Labels
        </Button>
      </div>

      {/* Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <StrictModeDroppable droppableId="board" type="LIST" direction="horizontal">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex gap-3 overflow-x-auto pb-4 flex-1 items-start"
              style={{ minHeight: 'calc(100vh - 14rem)' }}
            >
              {lists.map((list, index) => (
                <Draggable key={list.id} draggableId={list.id} index={index}>
                  {(dragProvided) => (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    <div ref={dragProvided.innerRef} {...(dragProvided.draggableProps as any)}>
                      <TaskList
                        list={list}
                        labels={labels}
                        dragHandleProps={dragProvided.dragHandleProps}
                        onOpenCard={setActiveCardId}
                        onRenamed={handleListRenamed}
                        onDeleted={handleListDeleted}
                        onCardAdded={handleCardAdded}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {/* Add list */}
              <div className="w-72 shrink-0 rounded-xl border border-dashed bg-muted/20 p-2.5">
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="+ Add a list"
                  className="h-9 text-sm border-0 bg-transparent focus-visible:ring-1 px-2"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddList() } }}
                />
                {newListName && (
                  <Button size="sm" className="mt-1.5 gap-1.5 w-full" onClick={handleAddList} disabled={addingList}>
                    <Plus className="h-3.5 w-3.5" />
                    Add List
                  </Button>
                )}
              </div>
            </div>
          )}
        </StrictModeDroppable>
      </DragDropContext>

      {/* Card detail */}
      {activeCard && (
        <TaskCardDetail
          open={!!activeCard}
          onOpenChange={(v) => { if (!v) setActiveCardId(null) }}
          card={activeCard.card}
          listId={activeCard.listId}
          labels={labels}
          onUpdated={(updated) => handleCardUpdated(activeCard.listId, updated)}
          onDeleted={() => handleCardDeleted(activeCard.listId, activeCard.card.id)}
        />
      )}

      {/* Label manager */}
      <BoardLabelManager
        open={labelManagerOpen}
        onOpenChange={setLabelManagerOpen}
        boardId={board.id}
        labels={labels}
        onCreated={handleLabelCreated}
        onDeleted={handleLabelDeleted}
      />
    </div>
  )
}
