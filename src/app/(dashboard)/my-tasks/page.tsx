import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { MyTasksDashboard } from '@/components/tasks-board/MyTasksDashboard'
import { isNzToday, isNzPast } from '@/lib/timezone'

export const metadata: Metadata = { title: 'My Tasks' }
export const dynamic = 'force-dynamic'

type CardRow = { id: string; due_date: string | null; is_archived: boolean }
type ListRow = { id: string; task_cards: CardRow[] }
type BoardRow = { id: string; name: string; color: string | null; position: number; task_lists: ListRow[] }

export default async function MyTasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const { data: boards } = await sb
    .from('task_boards')
    .select('id, name, color, position, task_lists(id, task_cards(id, due_date, is_archived))')
    .order('position')

  const boardRows = (boards ?? []) as BoardRow[]

  let dueToday = 0
  let overdue = 0
  let totalCards = 0

  const boardSummaries = boardRows.map(board => {
    const cards = board.task_lists.flatMap(l => l.task_cards).filter(c => !c.is_archived)
    const listCount = board.task_lists.length
    const cardCount = cards.length
    totalCards += cardCount
    for (const card of cards) {
      if (!card.due_date) continue
      if (isNzToday(card.due_date)) dueToday++
      else if (isNzPast(card.due_date)) overdue++
    }
    return { id: board.id, name: board.name, color: board.color, listCount, cardCount }
  })

  return (
    <MyTasksDashboard
      boards={boardSummaries}
      stats={{ boardCount: boardRows.length, totalCards, dueToday, overdue }}
    />
  )
}
