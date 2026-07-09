const SONETEL_AUTH_URL = 'https://api.sonetel.com/SonetelAuth/oauth/token'
const SONETEL_CALLBACK_URL = 'https://public-api.sonetel.com/make-calls/call/call-back'

export type SonetelResult =
  | { ok: true; sessionId: string }
  | { ok: false; error: string }

async function getSonetelAccessToken(): Promise<{ token: string } | { error: string }> {
  const username = process.env.SONETEL_USERNAME
  const password = process.env.SONETEL_PASSWORD

  if (!username || !password) {
    return { error: 'Sonetel is not configured — set SONETEL_USERNAME and SONETEL_PASSWORD' }
  }

  const basicAuth = Buffer.from('sonetel-api:sonetel-api').toString('base64')
  const body = new URLSearchParams({
    grant_type: 'password',
    username,
    password,
    refresh: 'no',
  })

  const res = await fetch(SONETEL_AUTH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const json = await res.json().catch(() => null) as {
    access_token?: string
    error?: string
    error_description?: string
  } | null

  if (!res.ok || !json?.access_token) {
    console.error('[sonetel] auth failed', res.status, JSON.stringify(json))
    return { error: json?.error_description ?? `Sonetel authentication failed (${res.status})` }
  }

  return { token: json.access_token }
}

// Callback call: Sonetel calls `call1` (the rep's own phone) first, and once
// answered, calls `call2` (the lead) and bridges the two. There is no
// browser-based dialer for this — the rep's phone must physically ring.
export async function startSonetelCallback(call1: string, call2: string, show2?: string): Promise<SonetelResult> {
  const tokenResult = await getSonetelAccessToken()
  if ('error' in tokenResult) return { ok: false, error: tokenResult.error }

  const res = await fetch(SONETEL_CALLBACK_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenResult.token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: 'acendia-crm',
      call1,
      call2,
      show_1: 'automatic',
      show_2: show2 ?? 'automatic',
    }),
  })

  const json = await res.json().catch(() => null) as {
    statusCode?: number
    response?: { session_id?: string; response?: string }
  } | null

  if (!res.ok || !json?.response?.session_id) {
    console.error('[sonetel] callback failed', res.status, JSON.stringify(json))
    return { ok: false, error: json?.response?.response ?? `Sonetel call failed (${res.status})` }
  }

  return { ok: true, sessionId: json.response.session_id }
}
