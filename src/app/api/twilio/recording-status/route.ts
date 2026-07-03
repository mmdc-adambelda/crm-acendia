import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Twilio POSTs here when a recording is ready.
// We use the CallSid to find the matching call_log and attach the recording URL.
export async function POST(req: NextRequest) {
  const body = await req.formData()

  const recordingUrl    = body.get('RecordingUrl') as string | null
  const recordingSid    = body.get('RecordingSid') as string | null
  const recordingStatus = body.get('RecordingStatus') as string | null
  const callSid         = body.get('CallSid') as string | null

  if (recordingStatus !== 'completed' || !recordingUrl || !callSid) {
    return new NextResponse('ok', { status: 200 })
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('call_logs') as any)
    .update({ recording_url: `${recordingUrl}.mp3`, recording_sid: recordingSid })
    .eq('twilio_call_sid', callSid)

  return new NextResponse('ok', { status: 200 })
}
