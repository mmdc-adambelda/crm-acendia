import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Called by PostCallLogDialog after saving a call log.
// Checks twilio_recordings_pending for a recording that arrived before the log was submitted,
// and links it to the newly created call_log row.
export async function POST(req: NextRequest) {
  const { callLogId, callSid } = await req.json() as { callLogId?: string; callSid?: string }

  if (!callLogId || !callSid) {
    return NextResponse.json({ linked: false })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pending } = await (supabase.from('twilio_recordings_pending') as any)
    .select('recording_sid, recording_url')
    .eq('call_sid', callSid)
    .single()

  if (!pending) {
    return NextResponse.json({ linked: false })
  }

  // Attach the recording to the call log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('call_logs') as any)
    .update({ recording_sid: pending.recording_sid, recording_url: pending.recording_url })
    .eq('id', callLogId)

  // Clean up the pending entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('twilio_recordings_pending') as any)
    .delete()
    .eq('call_sid', callSid)

  console.log('[claim-recording] linked recording', pending.recording_sid, 'to call_log', callLogId)
  return NextResponse.json({ linked: true })
}
