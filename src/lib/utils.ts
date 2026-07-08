import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'
import { isNzToday, isNzYesterday, formatNzDate, formatNzDateTime } from '@/lib/timezone'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Dates are always shown in NZ (Pacific/Auckland) time regardless of where
// this renders (Vercel's servers run in UTC) — see src/lib/timezone.ts.
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  if (isNzToday(date)) return 'Today'
  if (isNzYesterday(date)) return 'Yesterday'
  return formatNzDate(date)
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return formatNzDateTime(date)
}

export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}

export function parseCSVRow(row: Record<string, string>) {
  return {
    company_name: row['Company Name'] ?? row['company_name'] ?? '',
    contact_person: row['Contact Person'] ?? row['contact_person'] ?? '',
    email: row['Email'] ?? row['email'] ?? '',
    phone: row['Phone'] ?? row['phone'] ?? null,
    website: row['Website'] ?? row['website'] ?? null,
    industry: row['Industry'] ?? row['industry'] ?? null,
    location: row['Location'] ?? row['location'] ?? null,
    source: row['Source'] ?? row['source'] ?? 'Other',
    notes: row['Notes'] ?? row['notes'] ?? null,
  }
}

export function calculateLeadScore(lead: {
  email?: string | null
  phone?: string | null
  website?: string | null
  deal_value?: number | null
  source?: string | null
}): number {
  let score = 0
  if (lead.email) score += 20
  if (lead.phone) score += 15
  if (lead.website) score += 10
  if (lead.deal_value && lead.deal_value > 0) score += 25
  if (lead.source && lead.source !== 'Other') score += 10
  return Math.min(score, 100)
}
