import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendGmailEmail } from '@/lib/gmail'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return new NextResponse('Unauthorized', { status: 401 })

  const { leadId, clientId, toEmail, toName, subject, body } =
    await req.json() as {
      leadId?: string; clientId?: string
      toEmail: string; toName?: string
      subject: string; body: string
    }

  if (!toEmail || !subject || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from('profiles') as any)
    .select('full_name')
    .eq('id', user.id)
    .single()
  const senderName = (profile as { full_name: string | null } | null)?.full_name ?? undefined

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
      <div style="white-space:pre-wrap;line-height:1.6">${body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</div>
      <hr style="margin-top:40px;border:none;border-top:1px solid #eee">
      <p style="font-size:12px;color:#999;margin-top:12px">Sent via Acendia CRM</p>
    </div>
  `

  const result = await sendGmailEmail({
    fromEmail: user.email,
    fromName: senderName,
    toEmail,
    toName,
    subject,
    text: body,
    html: htmlBody,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('emails') as any).insert({
    lead_id: leadId ?? null,
    client_id: clientId ?? null,
    to_email: toEmail,
    to_name: toName ?? null,
    subject,
    body,
    sent_by: user.id,
    provider_message_id: result.messageId,
    type: 'manual',
  })

  return NextResponse.json({ success: true })
}
