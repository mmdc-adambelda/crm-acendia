import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Twilio calls this endpoint when the browser client initiates an outbound call.
// It must return TwiML instructing Twilio how to connect the call.
export async function POST(req: NextRequest) {
  const body = await req.formData()

  // Use to_number (custom param) to avoid collision with Twilio's built-in To field
  // which Twilio sets to the client identity (e.g. "client:user-uuid")
  const rawTo = (body.get('to_number') ?? body.get('To')) as string | null
  const to = rawTo?.replace(/[\s\-().]/g, '') ?? null  // strip formatting chars

  const fromNumber = (body.get('from_number') as string | null)?.replace(/\s/g, '')
    ?? process.env.TWILIO_PHONE_1?.replace(/\s/g, '')
    ?? process.env.TWILIO_PHONE_2?.replace(/\s/g, '')
    ?? ''

  const twilio = (await import('twilio')).default
  const twiml = new twilio.twiml.VoiceResponse()

  const isValidPhone = to && /^\+?[1-9]\d{5,14}$/.test(to)
  const hasCallerId = fromNumber.length > 0

  if (isValidPhone && hasCallerId) {
    const dial = twiml.dial({
      callerId: fromNumber,
      timeout: 30,
      record: 'record-from-answer',
      recordingStatusCallback: '/api/twilio/recording-status',
      recordingStatusCallbackMethod: 'POST',
    })
    dial.number(to)
  } else if (!hasCallerId) {
    // Caller ID missing — env var not configured
    twiml.say('Outbound calling is not configured. Please contact your administrator.')
  } else {
    twiml.say('We could not connect your call. Please check the number and try again.')
  }

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  })
}
