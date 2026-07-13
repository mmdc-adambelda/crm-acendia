import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const apiKey = process.env.TWILIO_API_KEY
  const apiSecret = process.env.TWILIO_API_SECRET
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID

  if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
    return NextResponse.json(
      { error: 'Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, and TWILIO_TWIML_APP_SID.' },
      { status: 503 }
    )
  }

  const twilio = (await import('twilio')).default
  const { AccessToken } = twilio.jwt
  const { VoiceGrant } = AccessToken

  const token = new AccessToken(accountSid, apiKey, apiSecret, {
    identity: user.id,
    ttl: 3600,
  })

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: twimlAppSid,
    incomingAllow: true,
  })
  token.addGrant(voiceGrant)

  const callerIds = [
    process.env.TWILIO_PHONE_1 ?? '',
    process.env.TWILIO_PHONE_2 ?? '',
  ].filter(Boolean)

  return NextResponse.json({ token: token.toJwt(), callerIds })
}
