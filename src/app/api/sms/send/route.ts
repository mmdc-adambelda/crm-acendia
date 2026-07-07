import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendClickSendSms } from '@/lib/clicksend'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { leadId, clientId, toPhone, toName, body } =
    await req.json() as {
      leadId?: string; clientId?: string
      toPhone: string; toName?: string
      body: string
    }

  if (!toPhone || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const to = toPhone.replace(/[\s\-().]/g, '')
  if (!/^\+?[1-9]\d{5,14}$/.test(to)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  const result = await sendClickSendSms(to, body)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  await sb.from('sms_messages').insert({
    lead_id: leadId ?? null,
    client_id: clientId ?? null,
    to_phone: to,
    to_name: toName ?? null,
    body,
    sent_by: user.id,
    provider_message_id: result.ok ? result.messageId : null,
    status: result.ok ? 'sent' : 'failed',
    type: 'manual',
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, messageId: result.messageId })
}
