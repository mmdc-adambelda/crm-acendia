'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

type Industry = { id: string; name: string; position: number }
type FieldDefinition = { id: string; name: string; field_type: string; position: number }

interface LeadFieldsManagerProps {
  industries: Industry[]
  customFields: FieldDefinition[]
}

export function LeadFieldsManager({ industries, customFields }: LeadFieldsManagerProps) {
  const router = useRouter()

  const [newIndustry, setNewIndustry] = React.useState('')
  const [addingIndustry, setAddingIndustry] = React.useState(false)
  const [deleteIndustry, setDeleteIndustry] = React.useState<Industry | null>(null)

  const [newFieldName, setNewFieldName] = React.useState('')
  const [addingField, setAddingField] = React.useState(false)
  const [deleteField, setDeleteField] = React.useState<FieldDefinition | null>(null)

  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  async function swapPositions(table: string, a: { id: string; position: number }, b: { id: string; position: number }) {
    setBusyId(a.id)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const from = supabase.from(table) as any
    await Promise.all([
      from.update({ position: b.position }).eq('id', a.id),
      from.update({ position: a.position }).eq('id', b.id),
    ])
    setBusyId(null)
    router.refresh()
  }

  function moveIndustry(index: number, direction: -1 | 1) {
    const other = industries[index + direction]
    if (!other) return
    swapPositions('industries', industries[index], other)
  }

  function moveField(index: number, direction: -1 | 1) {
    const other = customFields[index + direction]
    if (!other) return
    swapPositions('lead_custom_field_definitions', customFields[index], other)
  }

  async function handleAddIndustry() {
    const name = newIndustry.trim()
    if (!name) return
    setAddingIndustry(true)
    const supabase = createClient()
    const position = industries.length ? Math.max(...industries.map(i => i.position)) + 1 : 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('industries') as any).insert({ name, position })
    setAddingIndustry(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Added "${name}"`)
    setNewIndustry('')
    router.refresh()
  }

  async function handleDeleteIndustry() {
    if (!deleteIndustry) return
    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('industries').delete().eq('id', deleteIndustry.id)
    setIsDeleting(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Removed "${deleteIndustry.name}"`)
    setDeleteIndustry(null)
    router.refresh()
  }

  async function handleAddField() {
    const name = newFieldName.trim()
    if (!name) return
    setAddingField(true)
    const supabase = createClient()
    const position = customFields.length ? Math.max(...customFields.map(f => f.position)) + 1 : 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('lead_custom_field_definitions') as any)
      .insert({ name, field_type: 'text', position })
    setAddingField(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Added field "${name}"`)
    setNewFieldName('')
    router.refresh()
  }

  async function handleDeleteField() {
    if (!deleteField) return
    setIsDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('lead_custom_field_definitions').delete().eq('id', deleteField.id)
    setIsDeleting(false)
    if (error) { toast.error(error.message); return }
    toast.success(`Removed field "${deleteField.name}"`)
    setDeleteField(null)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {/* Industries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Industries
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border divide-y">
            {industries.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No industries yet</p>
            )}
            {industries.map((industry, index) => (
              <div key={industry.id} className="flex items-center gap-2 px-4 py-2.5">
                <span className="flex-1 text-sm font-medium">{industry.name}</span>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  disabled={index === 0 || busyId === industry.id}
                  onClick={() => moveIndustry(index, -1)}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  disabled={index === industries.length - 1 || busyId === industry.id}
                  onClick={() => moveIndustry(index, 1)}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteIndustry(industry)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              placeholder="e.g. Renewable Energy"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddIndustry() } }}
            />
            <Button onClick={handleAddIndustry} disabled={!newIndustry.trim() || addingIndustry} className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Custom Fields
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border divide-y">
            {customFields.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No custom fields yet</p>
            )}
            {customFields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2 px-4 py-2.5">
                <span className="flex-1 text-sm font-medium">{field.name}</span>
                <Badge variant="secondary" className="text-xs capitalize">{field.field_type}</Badge>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  disabled={index === 0 || busyId === field.id}
                  onClick={() => moveField(index, -1)}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  disabled={index === customFields.length - 1 || busyId === field.id}
                  onClick={() => moveField(index, 1)}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteField(field)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="e.g. Budget Range"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddField() } }}
            />
            <Select value="text" disabled>
              <SelectTrigger className="w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddField} disabled={!newFieldName.trim() || addingField} className="gap-1.5 shrink-0">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Custom fields appear on the lead form and lead detail page. Only text fields are supported today.
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteIndustry}
        onOpenChange={(v) => { if (!v) setDeleteIndustry(null) }}
        title="Remove Industry"
        description={`"${deleteIndustry?.name}" will no longer appear as an option. Leads already using it keep their existing value.`}
        variant="destructive"
        confirmLabel="Remove"
        onConfirm={handleDeleteIndustry}
        isPending={isDeleting}
      />

      <ConfirmDialog
        open={!!deleteField}
        onOpenChange={(v) => { if (!v) setDeleteField(null) }}
        title="Remove Custom Field"
        description={`"${deleteField?.name}" and all its saved values on leads will be permanently deleted. This cannot be undone.`}
        variant="destructive"
        confirmLabel="Remove"
        onConfirm={handleDeleteField}
        isPending={isDeleting}
      />
    </div>
  )
}
