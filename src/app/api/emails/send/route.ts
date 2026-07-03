import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { leadId, clientId, toEmail, toName, subject, body } =
    await req.json() as {
      leadId?: string; clientId?: string
      toEmail: string; toName?: string
      subject: string; body: string
    }

  if (!toEmail || !subject || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  if (!apiKey) {
    return NextResponse.json({ error: 'Email service not configured — add RESEND_API_KEY to env vars' }, { status: 500 })
  }

  const resend = new Resend(apiKey)
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
      <div style="white-space:pre-wrap;line-height:1.6">${body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')}</div>
      <hr style="margin-top:40px;border:none;border-top:1px solid #eee">
      <p style="font-size:12px;color:#999;margin-top:12px">Sent via Acendia CRM</p>
    </div>
  `

  const { data: sent, error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject,
    html: htmlBody,
    text: body,
  })

  if (sendError) {
    return NextResponse.json({ error: sendError.message }, { status: 500 })
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
    resend_id: sent?.id ?? null,
    type: 'manual',
  })

  return NextResponse.json({ success: true })
}
