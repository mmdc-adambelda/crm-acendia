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
import { SimpleListEditor } from './SimpleListEditor'

type ListItem = { id: string; name: string; position: number }
type FieldDefinition = { id: string; name: string; field_type: string; position: number }

interface LeadFieldsManagerProps {
  industries: ListItem[]
  countries: ListItem[]
  customFields: FieldDefinition[]
}

export function LeadFieldsManager({ industries, countries, customFields }: LeadFieldsManagerProps) {
  const router = useRouter()

  const [newFieldName, setNewFieldName] = React.useState('')
  const [addingField, setAddingField] = React.useState(false)
  const [deleteField, setDeleteField] = React.useState<FieldDefinition | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  function moveField(index: number, direction: -1 | 1) {
    const a = customFields[index]
    const b = customFields[index + direction]
    if (!a || !b) return
    setBusyId(a.id)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const from = supabase.from('lead_custom_field_definitions') as any
    Promise.all([
      from.update({ position: b.position }).eq('id', a.id),
      from.update({ position: a.position }).eq('id', b.id),
    ]).then(() => { setBusyId(null); router.refresh() })
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
      <SimpleListEditor
        table="industries"
        title="Industries"
        items={industries}
        addPlaceholder="e.g. Renewable Energy"
        emptyText="No industries yet"
        itemLabel="Industry"
      />

      <SimpleListEditor
        table="countries"
        title="Countries"
        items={countries}
        addPlaceholder="e.g. Canada"
        emptyText="No countries yet"
        itemLabel="Country"
      />

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
