'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { X, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LEAD_STATUSES, LEAD_SOURCES, CALL_OUTCOMES } from '@/types'

type TeamMember = {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface LeadFiltersProps {
  teamMembers: TeamMember[]
  total: number
}

export function LeadFilters({ teamMembers, total }: LeadFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''
  const source = searchParams.get('source') ?? ''
  const assignedTo = searchParams.get('assigned_to') ?? ''
  const lastCall = searchParams.get('last_call') ?? ''

  const [searchInput, setSearchInput] = React.useState(q)
  const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const hasFilters = q || status || source || assignedTo || lastCall

  function buildURL(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(overrides).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    params.set('page', '1')
    return `/leads?${params.toString()}`
  }

  function handleSearch(value: string) {
    setSearchInput(value)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      router.push(buildURL({ q: value }))
    }, 350)
  }

  function handleFilter(key: string, value: string) {
    router.push(buildURL({ [key]: value }))
  }

  function clearFilters() {
    setSearchInput('')
    router.push('/leads')
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Input
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search leads..."
          className="pr-8"
        />
        {searchInput && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Status filter */}
      <Select value={status || '_all'} onValueChange={(v) => handleFilter('status', v === '_all' ? '' : v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All statuses</SelectItem>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Source filter */}
      <Select value={source || '_all'} onValueChange={(v) => handleFilter('source', v === '_all' ? '' : v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All sources</SelectItem>
          {LEAD_SOURCES.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Assignee filter */}
      <Select value={assignedTo || '_all'} onValueChange={(v) => handleFilter('assigned_to', v === '_all' ? '' : v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="All assignees" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All assignees</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {teamMembers.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.full_name ?? m.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Last call filter */}
      <Select value={lastCall || '_all'} onValueChange={(v) => handleFilter('last_call', v === '_all' ? '' : v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Any last call" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Any last call</SelectItem>
          <SelectItem value="none">No calls yet</SelectItem>
          {CALL_OUTCOMES.map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}

      <span className="text-sm text-muted-foreground ml-auto hidden sm:block">
        {total.toLocaleString()} lead{total !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
