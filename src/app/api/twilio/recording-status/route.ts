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
  const parentCallSid   = body.get('ParentCallSid') as string | null

  // Log everything Twilio sends so we can compare with what's in the DB
  const allFields: Record<string, string> = {}
  body.forEach((v, k) => { allFields[k] = v.toString() })
  console.log('[recording-status] all fields:', allFields)

  if (recordingStatus !== 'completed' || !recordingUrl || !callSid) {
    console.log('[recording-status] skipping — not completed or missing fields')
    return new NextResponse('ok', { status: 200 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const recordingPayload = { recording_url: `${recordingUrl}.mp3`, recording_sid: recordingSid }

  // Try matching on CallSid first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: d1, error: e1 } = await (supabase.from('call_logs') as any)
    .update(recordingPayload)
    .eq('twilio_call_sid', callSid)
    .select('id')
  console.log('[recording-status] match by CallSid:', { callSid, rows: d1, error: e1?.message })

  // If nothing matched, try ParentCallSid (Twilio sends child SID for <Dial> recordings)
  if ((!d1 || d1.length === 0) && parentCallSid) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: d2, error: e2 } = await (supabase.from('call_logs') as any)
      .update(recordingPayload)
      .eq('twilio_call_sid', parentCallSid)
      .select('id')
    console.log('[recording-status] match by ParentCallSid:', { parentCallSid, rows: d2, error: e2?.message })
  }

  return new NextResponse('ok', { status: 200 })
}
