import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Proxy Twilio recordings through our server so we can attach auth headers.
// Twilio recording URLs require Basic Auth — we use the API Key + Secret
// (already in env vars) rather than exposing the Auth Token to the browser.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sid: string }> },
) {
  // Auth gate — only logged-in CRM users can play recordings
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorised', { status: 401 })

  const { sid } = await params
  if (!sid || !/^RE[0-9a-f]{32}$/.test(sid)) {
    return new NextResponse('Invalid recording SID', { status: 400 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID ?? ''
  const apiKey     = process.env.TWILIO_API_KEY     ?? ''
  const apiSecret  = process.env.TWILIO_API_SECRET  ?? ''

  if (!accountSid || !apiKey || !apiSecret) {
    return new NextResponse('Twilio credentials not configured', { status: 500 })
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${sid}.mp3`
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${credentials}` },
  })

  if (!res.ok) {
    return new NextResponse('Recording not found', { status: res.status })
  }

  return new NextResponse(res.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
