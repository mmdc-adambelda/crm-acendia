'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CALL_OUTCOMES } from '@/types'

const PERIODS = [
  { value: 'all',   label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
]

export function CallFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const my      = searchParams.get('my') ?? ''
  const outcome = searchParams.get('outcome') ?? ''
  const period  = searchParams.get('period') ?? 'all'

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') params.set(key, value)
    else params.delete(key)
    router.push(`/calls?${params.toString()}`)
  }

  function toggleMy() {
    const params = new URLSearchParams(searchParams.toString())
    if (my === '1') params.delete('my')
    else params.set('my', '1')
    router.push(`/calls?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={my === '1' ? 'default' : 'outline'}
        size="sm"
        onClick={toggleMy}
      >
        My Calls
      </Button>

      <Select value={outcome || 'all'} onValueChange={v => update('outcome', v)}>
        <SelectTrigger className="h-9 w-40">
          <SelectValue placeholder="All outcomes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All outcomes</SelectItem>
          {CALL_OUTCOMES.map(o => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={period} onValueChange={v => update('period', v)}>
        <SelectTrigger className="h-9 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map(p => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(my === '1' || outcome || (period && period !== 'all')) && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => router.push('/calls')}
        >
          Clear filters
        </Button>
      )}
    </div>
  )
}
