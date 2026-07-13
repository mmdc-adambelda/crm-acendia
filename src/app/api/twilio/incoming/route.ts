import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function normalize(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '')
}

// Twilio calls this when a call arrives at a configured phone number
// (set as the "A call comes in" webhook in the Twilio Console for each
// number). If that number is assigned to a specific team member (Settings
// → Team → Inbound Number), only their browser rings. Otherwise it falls
// back to ringing every active team member at once — whoever's Voice SDK
// Device answers first gets the call.
export async function POST(req: NextRequest) {
  const body = await req.formData()
  const dialedNumber = body.get('To') as string | null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (supabase.from('profiles') as any)
    .select('id, inbound_call_number')
    .eq('is_active', true)

  type ProfileRow = { id: string; inbound_call_number: string | null }
  const activeProfiles = (profiles ?? []) as ProfileRow[]

  const dialedDigits = normalize(dialedNumber)
  const assigned = dialedDigits
    ? activeProfiles.filter(p => p.inbound_call_number && normalize(p.inbound_call_number) === dialedDigits)
    : []

  // Ring the assigned owner(s) of this number if there are any, else ring everyone
  const identities = (assigned.length > 0 ? assigned : activeProfiles).map(p => p.id)

  const twilio = (await import('twilio')).default
  const twiml = new twilio.twiml.VoiceResponse()

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
