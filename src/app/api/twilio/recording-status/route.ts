import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Twilio POSTs here when a recording is ready (usually within seconds of call ending).
// Uses service role client — Twilio requests have no session cookies.
export async function POST(req: NextRequest) {
  const body = await req.formData()

  const recordingUrl    = body.get('RecordingUrl') as string | null
  const recordingSid    = body.get('RecordingSid') as string | null
  const recordingStatus = body.get('RecordingStatus') as string | null
  const callSid         = body.get('CallSid') as string | null

  console.log('[recording-status] received:', { recordingStatus, recordingSid, callSid })

  if (recordingStatus !== 'completed' || !recordingUrl || !callSid) {
    return new NextResponse('ok', { status: 200 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const recordingPayload = { recording_url: `${recordingUrl}.mp3`, recording_sid: recordingSid }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: matched } = await (supabase.from('call_logs') as any)
    .update(recordingPayload)
    .eq('twilio_call_sid', callSid)
    .select('id')

  if (matched && matched.length > 0) {
    console.log('[recording-status] linked to call_log:', matched[0].id)
    return new NextResponse('ok', { status: 200 })
  }

  // Race condition: the recording arrived before the agent submitted the call log dialog.
  // Store it in the pending table — PostCallLogDialog will claim it on submit.
  console.log('[recording-status] no matching call_log yet, storing as pending for callSid:', callSid)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('twilio_recordings_pending') as any)
    .upsert({ call_sid: callSid, recording_sid: recordingSid, recording_url: `${recordingUrl}.mp3` })

  return new NextResponse('ok', { status: 200 })
}
