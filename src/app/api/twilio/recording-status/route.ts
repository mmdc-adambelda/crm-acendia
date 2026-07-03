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

  console.log('[recording-status] received:', { recordingStatus, recordingSid, callSid, hasUrl: !!recordingUrl })

  if (recordingStatus !== 'completed' || !recordingUrl || !callSid) {
    console.log('[recording-status] skipping — not completed or missing fields')
    return new NextResponse('ok', { status: 200 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('call_logs') as any)
    .update({ recording_url: `${recordingUrl}.mp3`, recording_sid: recordingSid })
    .eq('twilio_call_sid', callSid)
    .select('id')

  if (error) {
    console.error('[recording-status] DB update failed:', error.message)
  } else {
    console.log('[recording-status] updated rows:', data)
  }

  return new NextResponse('ok', { status: 200 })
}
