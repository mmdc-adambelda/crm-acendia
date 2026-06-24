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
import { LEAD_STATUSES, LEAD_SOURCES, type LeadStatus, type LeadSource } from '@/types'

interface CSVImportProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

type CSVRow = Record<string, string>

const REQUIRED_COLS = ['company_name', 'contact_person', 'email'] as const
const TEMPLATE_HEADERS = [
  'company_name',
  'contact_person',
  'email',
  'phone',
  'website',
  'industry',
  'location',
  'status',
  'source',
  'deal_value',
  'notes',
]

function downloadTemplate() {
  const header = TEMPLATE_HEADERS.join(',')
  const example = [
    'Acme Corp',
    'John Smith',
    'john@acme.com',
    '+1 555 0100',
    'https://acme.com',
    'Technology',
    'New York, USA',
    'New',
    'Website',
    '50000',
    'Referred by partner',
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

function validateRow(row: CSVRow): string[] {
  const errors: string[] = []
  if (!row.company_name?.trim()) errors.push('company_name required')
  if (!row.contact_person?.trim()) errors.push('contact_person required')
  if (!row.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email))
    errors.push('valid email required')
  if (row.status && !LEAD_STATUSES.includes(row.status as never))
    errors.push(`invalid status (use: ${LEAD_STATUSES.join(', ')})`)
  if (row.source && !LEAD_SOURCES.includes(row.source as never))
    errors.push(`invalid source`)
  return errors
}

export function CSVImport({ open, onOpenChange, userId }: CSVImportProps) {
  const router = useRouter()
  const [rows, setRows] = React.useState<CSVRow[]>([])
  const [errors, setErrors] = React.useState<Map<number, string[]>>(new Map())
  const [isPending, setIsPending] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  function reset() {
    setRows([])
    setErrors(new Map())
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
      company_name: row.company_name.trim(),
      contact_person: row.contact_person.trim(),
      email: row.email.trim().toLowerCase(),
      phone: row.phone?.trim() || null,
      website: row.website?.trim() || null,
      industry: row.industry?.trim() || null,
      location: row.location?.trim() || null,
      status: (LEAD_STATUSES.includes(row.status as LeadStatus) ? row.status : 'New') as LeadStatus,
      source: (LEAD_SOURCES.includes(row.source as LeadSource) ? row.source : 'Other') as LeadSource,
      deal_value: row.deal_value ? parseFloat(row.deal_value) || null : null,
      notes: row.notes?.trim() || null,
      created_by: userId,
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
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Download the template to see the required format
            </p>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 shrink-0">
              <Download className="h-3.5 w-3.5" />
              Template
            </Button>
          </div>

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
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr
                        key={i}
                        className={errors.has(i) ? 'bg-red-50 dark:bg-red-950/20' : ''}
                      >
                        <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                        <td className="px-2 py-1">{row.company_name || '—'}</td>
                        <td className="px-2 py-1">{row.contact_person || '—'}</td>
                        <td className="px-2 py-1">{row.email || '—'}</td>
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
