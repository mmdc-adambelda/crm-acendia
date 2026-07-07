const MOCEAN_SEND_URL = 'https://rest.moceanapi.com/rest/2/sms'

export type MoceanResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string }

type MoceanMessageResult = {
  status?: number | string
  msgid?: string
  err_msg?: string
}

type MoceanResponse = MoceanMessageResult & {
  messages?: MoceanMessageResult[]
}

export async function sendMoceanSms(to: string, body: string): Promise<MoceanResult> {
  const apiKey = process.env.MOCEAN_API_KEY
  const apiSecret = process.env.MOCEAN_API_SECRET
  const from = process.env.MOCEAN_SMS_FROM

  if (!apiKey || !apiSecret || !from) {
    return {
      ok: false,
      error: 'SMS service not configured — set MOCEAN_API_KEY, MOCEAN_API_SECRET, and MOCEAN_SMS_FROM',
    }
  }

  const params = new URLSearchParams({
    'mocean-api-key': apiKey,
    'mocean-api-secret': apiSecret,
    'mocean-from': from,
    'mocean-to': to,
    'mocean-text': body,
    'mocean-resp-format': 'json',
  })

  const res = await fetch(MOCEAN_SEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const json = await res.json().catch(() => null) as MoceanResponse | null

  if (!res.ok || !json) {
    console.error('[mocean] request failed', res.status, JSON.stringify(json))
    return { ok: false, error: `Mocean request failed (${res.status})` }
  }

  // Response shape varies by endpoint version — either a flat object or a
  // `messages` array. Normalize to a single result before reading status.
  const result = json.messages?.[0] ?? json
  const isSuccess = String(result.status ?? '') === '0'

  if (!isSuccess) {
    console.error('[mocean] message rejected', JSON.stringify(json))
    return { ok: false, error: result.err_msg || `Mocean status ${result.status}` }
  }

  return { ok: true, messageId: result.msgid ?? '' }
}
