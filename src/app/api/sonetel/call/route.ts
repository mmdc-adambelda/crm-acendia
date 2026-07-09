import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startSonetelCallback } from '@/lib/sonetel'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { to } = await req.json() as { to?: string }
  if (!to) {
    return NextResponse.json({ error: 'Missing lead phone number' }, { status: 400 })
  }

  const call2 = to.replace(/[\s\-().]/g, '')
  if (!/^\+?[1-9]\d{5,14}$/.test(call2)) {
    return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('phone')
    .eq('id', user.id)
    .single()

  const call1 = (profile as { phone: string | null } | null)?.phone?.replace(/[\s\-().]/g, '')
  if (!call1) {
    return NextResponse.json(
      { error: 'Add your phone number in Settings → Profile before calling via Sonetel' },
      { status: 400 },
    )
  }

  const showCallerId = process.env.SONETEL_CALLER_ID
  const result = await startSonetelCallback(call1, call2, showCallerId)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, sessionId: result.sessionId, callingPhone: call1 })
}
