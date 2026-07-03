import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'

// Runs every hour via Vercel Cron — finds appointments in 23–25 hour window
// and sends a 24-hour reminder to the lead's email.
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

  const now = new Date()
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000)
  const windowEnd   = new Date(now.getTime() + 25 * 60 * 60 * 1000)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: appointments } = await (supabase.from('call_logs') as any)
    .select('id, appointment_at, lead:leads(id, company_name, contact_person, email)')
    .gte('appointment_at', windowStart.toISOString())
    .lte('appointment_at', windowEnd.toISOString())
    .eq('reminder_sent', false)
    .not('appointment_at', 'is', null)
    .not('lead_id', 'is', null)

  if (!appointments || appointments.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  let sent = 0

  for (const appt of appointments) {
    const lead = appt.lead
    if (!lead?.email) continue

    const apptDate = new Date(appt.appointment_at)
    const formatted = apptDate.toLocaleString('en-NZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Pacific/Auckland',
    })

    const greeting = lead.contact_person || lead.company_name
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
      await (supabase.from('call_logs') as any)
        .update({ reminder_sent: true })
        .eq('id', appt.id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('emails') as any).insert({
        lead_id: lead.id,
        to_email: lead.email,
        to_name: greeting,
        subject,
        body: textBody,
        type: 'reminder',
      })

      sent++
      console.log(`[appointment-reminders] sent reminder to ${lead.email} for ${formatted}`)
    } else {
      console.error(`[appointment-reminders] failed for lead ${lead.id}:`, error.message)
    }
  }

  return NextResponse.json({ sent })
}
