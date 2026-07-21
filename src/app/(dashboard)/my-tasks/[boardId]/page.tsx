import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { TaskBoard } from '@/components/tasks-board/TaskBoard'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ boardId: string }>
}): Promise<Metadata> {
  const { boardId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('task_boards').select('name').eq('id', boardId).single()
  return { title: (data as { name: string } | null)?.name ?? 'Board' }
}

type CardJoinRow = {
  id: string
  list_id: string
  title: string
  description: string | null
  due_date: string | null
  position: number
  task_card_labels: { label_id: string }[]
  task_checklist_items: { id: string; is_done: boolean }[]
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>
}) {
  const { boardId } = await params
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: board, error: boardError } = await sb
    .from('task_boards')
    .select('id, name, color')
    .eq('id', boardId)
    .single()

  if (boardError || !board) notFound()

  const [{ data: lists }, { data: cards }, { data: labels }] = await Promise.all([
    sb.from('task_lists').select('id, name, position').eq('board_id', boardId).order('position'),
    sb.from('task_cards')
      .select('id, list_id, title, description, due_date, position, task_card_labels(label_id), task_checklist_items(id, is_done)')
      .eq('is_archived', false)
      .order('position'),
    sb.from('task_labels').select('id, name, color').eq('board_id', boardId).order('created_at'),
  ])

  type ListRow = { id: string; name: string; position: number }
  const listRows = (lists ?? []) as ListRow[]
  const cardRows = ((cards ?? []) as CardJoinRow[]).filter(c => listRows.some(l => l.id === c.list_id))

  const listsWithCards = listRows.map(list => ({
    id: list.id,
    name: list.name,
    position: list.position,
    cards: cardRows
      .filter(c => c.list_id === list.id)
      .map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        due_date: c.due_date,
        position: c.position,
        labelIds: c.task_card_labels.map(l => l.label_id),
        checklistTotal: c.task_checklist_items.length,
        checklistDone: c.task_checklist_items.filter(i => i.is_done).length,
      })),
  }))

  return (
    <TaskBoard
      board={board as { id: string; name: string; color: string | null }}
      initialLists={listsWithCards}
      initialLabels={(labels ?? []) as { id: string; name: string; color: string }[]}
    />
  )
}
