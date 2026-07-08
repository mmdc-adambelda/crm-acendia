import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { LeadFieldsManager } from '@/components/settings/LeadFieldsManager'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Lead Fields Settings' }
export const dynamic = 'force-dynamic'

export default async function LeadFieldsSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const [profileResult, industriesResult, fieldsResult] = await Promise.all([
    sb.from('profiles').select('role').eq('id', user.id).single(),
    sb.from('industries').select('id, name, position').order('position'),
    sb.from('lead_custom_field_definitions').select('id, name, field_type, position').order('position'),
  ])

  const role = (profileResult as { data: { role: string } | null }).data?.role
  if (role !== 'super_admin' && role !== 'admin') {
    notFound()
  }

  type Industry = { id: string; name: string; position: number }
  type FieldDefinition = { id: string; name: string; field_type: string; position: number }

  const industries = ((industriesResult as { data: unknown[] | null }).data ?? []) as Industry[]
  const customFields = ((fieldsResult as { data: unknown[] | null }).data ?? []) as FieldDefinition[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lead Fields</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Manage industry options and custom fields shown on leads
        </p>
      </div>
      <LeadFieldsManager industries={industries} customFields={customFields} />
    </div>
  )
}
