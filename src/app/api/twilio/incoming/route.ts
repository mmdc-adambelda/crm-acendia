import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Twilio calls this when a call arrives at a configured phone number
// (set as the "A call comes in" webhook in the Twilio Console for each
// number). Rings every active team member's browser client at once —
// whoever's Voice SDK Device answers first gets the call.
export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase.from('profiles') as any)
    .select('id')
    .eq('is_active', true)

  const twilio = (await import('twilio')).default
  const twiml = new twilio.twiml.VoiceResponse()

  const identities = ((profiles ?? []) as { id: string }[]).map(p => p.id)

  if (identities.length === 0) {
    twiml.say('No one is available to take your call right now. Please try again later.')
    return new NextResponse(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } })
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin).replace(/\/$/, '')
  const dial = twiml.dial({
    timeout: 20,
    record: 'record-from-answer',
    recordingStatusCallback: `${appUrl}/api/twilio/recording-status`,
    recordingStatusCallbackMethod: 'POST',
  })
  for (const identity of identities) {
    dial.client(identity)
  }

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  })
}
