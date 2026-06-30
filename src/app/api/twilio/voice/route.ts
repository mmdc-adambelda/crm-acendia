import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Twilio calls this endpoint when the browser client initiates an outbound call.
// It must return TwiML instructing Twilio how to connect the call.
export async function POST(req: NextRequest) {
  const body = await req.formData()
  const to = body.get('To') as string | null
  const fromNumber = (body.get('from_number') as string | null) ?? process.env.TWILIO_PHONE_1 ?? ''

  const twilio = (await import('twilio')).default
  const twiml = new twilio.twiml.VoiceResponse()

  // Basic validation — must be a plausible E.164 phone number
  if (to && /^\+?[1-9]\d{6,14}$/.test(to.replace(/\s/g, ''))) {
    const dial = twiml.dial({ callerId: fromNumber, timeout: 30 })
    dial.number(to.replace(/\s/g, ''))
  } else {
    twiml.say('We could not connect your call. Please check the number and try again.')
  }

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  })
}
