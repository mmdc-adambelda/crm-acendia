'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { LeadStatus } from '@/types'

type TeamMember = { id: string; full_name: string | null }

interface CSVImportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  teamMembers: TeamMember[]
}

type CSVRow = Record<string, string>

// Column headers that match the manual lead tracker format
const TEMPLATE_HEADERS = [
  'Company Name',
  'Industry',
  'Contact Person',
  'Phone Number',
  'Email',
  'Website',
  'Lead Score (/100)',
  'Call Status',
  'Attempts',
  'Outcome',
  'Callback Time',
  'Follow-up Date',
  'Notes / Talking Points',
  'Next Action',
]

function downloadTemplate() {
  const header = TEMPLATE_HEADERS.join(',')
  const example = [
    'Acme Corp',
    'Technology',
    'John Smith',
    '+1 555 0100',
    'john@acme.com',
    'https://acme.com',
    '75',
    'Answered',
    '2',
    'Interested',
    '',
    '2026-07-20',
    'Great fit for our services. Budget confirmed.',
    'Send proposal',
  ].join(',')
  const csv = `${header}\n${example}`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'leads-import-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// Outcome (primary) + Call Status (fallback) → LeadStatus
function mapToLeadStatus(outcome: string, callStatus: string): LeadStatus {
  const o = outcome.toLowerCase().trim()
  const s = callStatus.toLowerCase().trim()

  // Outcome takes priority — reflects the business result of the conversation
  if (o.includes('booked') || o.includes('meeting')) return 'Proposal Sent'
  if (o.includes('proposal') || o.includes('sent')) return 'Proposal Sent'
  if (o.includes('negotiat')) return 'Negotiation'
  if (o.includes('won') || o.includes('closed won')) return 'Won'
  if (o.includes('not interested') || o.includes('no interest') || o.includes('closed lost')) return 'Lost'
  if ((o.includes('interested') && !o.includes('not')) || o.includes('qualified')) return 'Qualified'
  if (o.includes('callback') || o.includes('follow') || o.includes('voicemail') || o.includes('left message')) return 'Contacted'
  if (o && o !== 'n/a' && o !== '-' && o !== '') return 'Contacted'

  // Fall back to call status
  if (s.includes('answered') || s.includes('connected')) return 'Contacted'
  if (s.includes('voicemail') || s.includes('left message')) return 'Contacted'
  if (s.includes('callback')) return 'Contacted'
  if (s.includes('no answer') || s.includes('busy') || s.includes('wrong number')) return 'New'
  if (s && s !== 'n/a' && s !== '-' && s !== '') return 'Contacted'

  return 'New'
}

function parseLeadScore(raw: string | undefined): number {
  if (!raw?.trim()) return 0
  // Strip "/100" suffix if present (e.g. "75/100" → 75)
  const cleaned = raw.trim().replace(/\s*\/\s*100.*/, '').trim()
  const n = parseInt(cleaned, 10)
  if (isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

function buildNotes(row: CSVRow): string | null {
  const base = row['Notes / Talking Points']?.trim() || ''

  const outreachLines = [
    row['Attempts']?.trim() ? `Attempts: ${row['Attempts'].trim()}` : '',
    row['Callback Time']?.trim() ? `Callback Time: ${row['Callback Time'].trim()}` : '',
    row['Follow-up Date']?.trim() ? `Follow-up Date: ${row['Follow-up Date'].trim()}` : '',
    row['Next Action']?.trim() ? `Next Action: ${row['Next Action'].trim()}` : '',
  ].filter(Boolean)

  if (!base && outreachLines.length === 0) return null

  const parts = [base, outreachLines.length ? outreachLines.join('\n') : ''].filter(Boolean)
  return parts.join('\n\n')
}

function validateRow(row: CSVRow): string[] {
  const errors: string[] = []
  if (!row['Company Name']?.trim()) errors.push('Company Name required')
  if (!row['Contact Person']?.trim()) errors.push('Contact Person required')
  const email = row['Email']?.trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push('valid Email required')
  const scoreRaw = row['Lead Score (/100)']?.trim().replace(/\s*\/\s*100.*/, '').trim()
  if (scoreRaw && (isNaN(Number(scoreRaw)) || Number(scoreRaw) < 0 || Number(scoreRaw) > 100))
    errors.push('Lead Score must be 0–100')
  return errors
}

export function CSVImport({ open, onOpenChange, userId, teamMembers }: CSVImportProps) {
  const router = useRouter()
  const [rows, setRows] = React.useState<CSVRow[]>([])
  const [errors, setErrors] = React.useState<Map<number, string[]>>(new Map())
  const [isPending, setIsPending] = React.useState(false)
  const [assignToId, setAssignToId] = React.useState<string>(userId)
  const fileRef = React.useRef<HTMLInputElement>(null)

  function reset() {
    setRows([])
    setErrors(new Map())
    setAssignToId(userId)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data
        const errs = new Map<number, string[]>()
        parsed.forEach((row, i) => {
          const rowErrors = validateRow(row)
          if (rowErrors.length) errs.set(i, rowErrors)
        })
        setRows(parsed)
        setErrors(errs)
      },
    })
  }

  async function handleImport() {
    if (errors.size > 0) {
      toast.error('Fix validation errors before importing')
      return
    }
    const validRows = rows.filter((_, i) => !errors.has(i))
    if (!validRows.length) {
      toast.error('No valid rows to import')
      return
    }

    setIsPending(true)
    const supabase = createClient()

    const records = validRows.map((row) => ({
      company_name: row['Company Name'].trim(),
      industry: row['Industry']?.trim() || null,
      contact_person: row['Contact Person'].trim(),
      phone: row['Phone Number']?.trim() || null,
      email: row['Email'].trim().toLowerCase(),
      website: row['Website']?.trim() || null,
      lead_score: parseLeadScore(row['Lead Score (/100)']),
      status: mapToLeadStatus(row['Outcome'] ?? '', row['Call Status'] ?? ''),
      source: 'Cold Outreach' as const,
      notes: buildNotes(row),
      created_by: userId,
      assigned_to: assignToId,
    }))

    // Cast builder to any — Supabase builder types collapse with complex Database generics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const from = supabase.from('leads') as any
    const { error } = await from.insert(records)

    setIsPending(false)

    if (error) {
      toast.error(`Import failed: ${error.message}`)
      return
    }

    toast.success(`Imported ${records.length} lead${records.length !== 1 ? 's' : ''} successfully`)
    router.refresh()
    reset()
    onOpenChange(false)
  }

  const validCount = rows.length - errors.size
  const hasErrors = errors.size > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download template */}
          <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Lead tracker format</p>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 shrink-0">
                <Download className="h-3.5 w-3.5" />
                Template
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Columns: Company Name, Industry, Contact Person, Phone Number, Email, Website, Lead Score, Call Status, Attempts, Outcome, Callback Time, Follow-up Date, Notes / Talking Points, Next Action
            </p>
            <p className="text-xs text-muted-foreground">
              Outcome + Call Status automatically map to Lead Status. Attempts, Callback Time, Follow-up Date, and Next Action are saved in Notes.
            </p>
          </div>

          {/* Assign to */}
          {teamMembers.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium shrink-0">Assign all leads to</label>
              <Select value={assignToId} onValueChange={setAssignToId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name ?? m.id}{m.id === userId ? ' (me)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* File upload */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <Upload className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm font-medium">Click to upload CSV file</p>
              <p className="text-xs text-muted-foreground">Supports .csv files</p>
            </label>
          </div>

          {/* Preview */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {hasErrors ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                <p className="text-sm font-medium">
                  {rows.length} rows parsed —{' '}
                  <span className="text-green-600">{validCount} valid</span>
                  {hasErrors && (
                    <span className="text-red-500 ml-1">, {errors.size} with errors</span>
                  )}
                </p>
              </div>

              {hasErrors && (
                <div className="max-h-32 overflow-y-auto space-y-1 rounded-md bg-red-50 dark:bg-red-950/20 p-3">
                  {Array.from(errors.entries()).map(([i, errs]) => (
                    <p key={i} className="text-xs text-red-600">
                      Row {i + 2}: {errs.join('; ')}
                    </p>
                  ))}
                </div>
              )}

              <div className="max-h-40 overflow-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium">#</th>
                      <th className="px-2 py-1 text-left font-medium">Company</th>
                      <th className="px-2 py-1 text-left font-medium">Contact</th>
                      <th className="px-2 py-1 text-left font-medium">Email</th>
                      <th className="px-2 py-1 text-left font-medium">→ Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr
                        key={i}
                        className={errors.has(i) ? 'bg-red-50 dark:bg-red-950/20' : ''}
                      >
                        <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-1">{row['Company Name'] || '—'}</td>
                        <td className="px-2 py-1">{row['Contact Person'] || '—'}</td>
                        <td className="px-2 py-1">{row['Email'] || '—'}</td>
                        <td className="px-2 py-1 text-muted-foreground">
                          {mapToLeadStatus(row['Outcome'] ?? '', row['Call Status'] ?? '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 10 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground border-t">
                    +{rows.length - 10} more rows…
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!rows.length || hasErrors || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing…
              </>
            ) : (
              `Import ${validCount} Lead${validCount !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
