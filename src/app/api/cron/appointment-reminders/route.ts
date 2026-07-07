import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { sendClickSendSms } from '@/lib/clicksend'

export const runtime = 'nodejs'

type Appointment = {
  id: string
  appointment_at: string
  reminder_sent: boolean
  sms_reminder_sent: boolean
  lead: {
    id: string
    company_name: string
    contact_person: string
    email: string
    phone: string | null
  } | null
}

const NZ_TIME_ZONE = 'Pacific/Auckland'

// How far `date` (a real UTC instant) sits ahead of UTC when read as NZ wall-clock time.
function nzOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: NZ_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) if (p.type !== 'literal') map[p.type] = p.value
  const hour = Number(map.hour) === 24 ? 0 : Number(map.hour)
  const asUtc = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), hour, Number(map.minute), Number(map.second))
  return asUtc - date.getTime()
}

// [start, end) UTC instants spanning "tomorrow" as a full calendar day in NZ time.
function nzTomorrowRangeUtc(now: Date): { start: Date; end: Date } {
  const offset = nzOffsetMs(now)
  const nzWallNow = new Date(now.getTime() + offset)
  const tomorrowStartWall = Date.UTC(nzWallNow.getUTCFullYear(), nzWallNow.getUTCMonth(), nzWallNow.getUTCDate() + 1)
  const dayAfterStartWall = Date.UTC(nzWallNow.getUTCFullYear(), nzWallNow.getUTCMonth(), nzWallNow.getUTCDate() + 2)
  return { start: new Date(tomorrowStartWall - offset), end: new Date(dayAfterStartWall - offset) }
}

// Runs once daily via Vercel Cron (Hobby plan caps cron jobs at once/day) —
// finds every appointment scheduled for "tomorrow" in NZ time and sends a
// reminder by email and/or SMS. The two channels are tracked with separate
// flags so a lead missing one contact method (e.g. no phone) doesn't block
// the other channel.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const resend = new Resend(process.env.RESEND_API_KEY)
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  const { start, end } = nzTomorrowRangeUtc(new Date())

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: appointments } = await (supabase.from('call_logs') as any)
    .select('id, appointment_at, reminder_sent, sms_reminder_sent, lead:leads(id, company_name, contact_person, email, phone)')
    .gte('appointment_at', start.toISOString())
    .lt('appointment_at', end.toISOString())
    .or('reminder_sent.eq.false,sms_reminder_sent.eq.false')
    .not('appointment_at', 'is', null)
    .not('lead_id', 'is', null)

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ emailsSent: 0, smsSent: 0 })
  }

  let emailsSent = 0
  let smsSent = 0

  for (const appt of appointments as Appointment[]) {
    const lead = appt.lead
    if (!lead) continue

    const apptDate = new Date(appt.appointment_at)
    const greeting = lead.contact_person || lead.company_name

    // ── Email reminder ──────────────────────────────────────────────────
    if (!appt.reminder_sent && lead.email) {
      const formatted = apptDate.toLocaleString('en-NZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Pacific/Auckland',
      })

      const subject  = 'Reminder: Your appointment with Acendia International is tomorrow'
      const textBody = `Hi ${greeting},\n\nThis is a friendly reminder that you have an appointment scheduled with the Acendia International team:\n\n${formatted}\n\nWe look forward to speaking with you. If you need to reschedule, please don't hesitate to reach out.\n\nBest regards,\nThe Acendia International Team`

      const { error } = await resend.emails.send({
        from: fromEmail,
        to: lead.email,
        subject,
        text: textBody,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111">
            <h2 style="margin:0 0 16px">Appointment Reminder</h2>
            <p>Hi ${greeting},</p>
            <p>This is a friendly reminder that you have an appointment scheduled with the <strong>Acendia International</strong> team:</p>
            <div style="background:#f5f5f5;border-radius:8px;padding:16px 20px;margin:20px 0">
              <p style="margin:0;font-size:16px;font-weight:600">${formatted}</p>
            </div>
            <p>We look forward to speaking with you. If you need to reschedule, please don't hesitate to reach out.</p>
            <p>Best regards,<br><strong>The Acendia International Team</strong></p>
            <hr style="margin-top:32px;border:none;border-top:1px solid #eee">
            <p style="font-size:12px;color:#999">You are receiving this email because an appointment was booked on your behalf.</p>
          </div>
        `,
      })

      if (!error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('call_logs') as any).update({ reminder_sent: true }).eq('id', appt.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('emails') as any).insert({
          lead_id: lead.id,
          to_email: lead.email,
          to_name: greeting,
          subject,
          body: textBody,
          type: 'reminder',
        })
        emailsSent++
        console.log(`[appointment-reminders] emailed ${lead.email} for ${formatted}`)
      } else {
        console.error(`[appointment-reminders] email failed for lead ${lead.id}:`, error.message)
      }
    }

    // ── SMS reminder ─────────────────────────────────────────────────────
    if (!appt.sms_reminder_sent && lead.phone) {
      const to = lead.phone.replace(/[\s\-().]/g, '')

      if (/^\+?[1-9]\d{5,14}$/.test(to)) {
        const smsFormatted = apptDate.toLocaleString('en-NZ', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Pacific/Auckland',
        })
        const smsBody = `Hi ${greeting}, reminder: your appointment with Acendia International is ${smsFormatted} (NZ time). Reply STOP to opt out.`

        const result = await sendClickSendSms(to, smsBody)

        if (result.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('call_logs') as any).update({ sms_reminder_sent: true }).eq('id', appt.id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('sms_messages') as any).insert({
            lead_id: lead.id,
            to_phone: to,
            to_name: greeting,
            body: smsBody,
            provider_message_id: result.messageId,
            status: 'sent',
            type: 'reminder',
          })
          smsSent++
          console.log(`[appointment-reminders] texted ${to} for ${smsFormatted}`)
        } else {
          console.error(`[appointment-reminders] SMS failed for lead ${lead.id}:`, result.error)
        }
      }
    }
  }

  return NextResponse.json({ emailsSent, smsSent })
}
