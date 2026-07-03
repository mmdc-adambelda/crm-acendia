import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Twilio POSTs here when a recording is ready.
// Uses service role client — Twilio requests have no session cookies so the
// normal cookie-based client would be unauthenticated and RLS would block it.
export async function POST(req: NextRequest) {
  const body = await req.formData()

  const recordingUrl    = body.get('RecordingUrl') as string | null
  const recordingSid    = body.get('RecordingSid') as string | null
  const recordingStatus = body.get('RecordingStatus') as string | null
  const callSid         = body.get('CallSid') as string | null

  if (recordingStatus !== 'completed' || !recordingUrl || !callSid) {
    return new NextResponse('ok', { status: 200 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('call_logs') as any)
    .update({ recording_url: `${recordingUrl}.mp3`, recording_sid: recordingSid })
    .eq('twilio_call_sid', callSid)

  return new NextResponse('ok', { status: 200 })
}
