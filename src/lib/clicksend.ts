const CLICKSEND_SEND_URL = 'https://rest.clicksend.com/v3/sms/send'

export type ClickSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string }

export async function sendClickSendSms(to: string, body: string): Promise<ClickSendResult> {
  const username = process.env.CLICKSEND_USERNAME
  const apiKey = process.env.CLICKSEND_API_KEY
  const from = process.env.CLICKSEND_SMS_FROM

  if (!username || !apiKey) {
    return {
      ok: false,
      error: 'SMS service not configured — set CLICKSEND_USERNAME and CLICKSEND_API_KEY',
    }
  }

  const credentials = Buffer.from(`${username}:${apiKey}`).toString('base64')

  const res = await fetch(CLICKSEND_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          source: 'acendia-crm',
          body,
          to,
          ...(from ? { from } : {}),
        },
      ],
    }),
  })

  const json = await res.json().catch(() => null) as {
    response_code?: string
    response_msg?: string
    data?: { messages?: { message_id: string; status: string }[] }
  } | null

  if (!res.ok || !json || json.response_code !== 'SUCCESS') {
    console.error('[clicksend] request failed', res.status, JSON.stringify(json))
    return { ok: false, error: json?.response_msg ?? `ClickSend request failed (${res.status})` }
  }

  const message = json.data?.messages?.[0]

  if (!message) {
    console.error('[clicksend] no message in response', JSON.stringify(json))
    return { ok: false, error: json.response_msg ?? 'ClickSend returned no message result' }
  }

  // ClickSend accepts the HTTP request (response_code: SUCCESS) even when an
  // individual message is rejected — the per-message `status` field carries
  // the real reason (e.g. low balance, unverified trial number, bad format).
  if (message.status !== 'SUCCESS') {
    console.error('[clicksend] message rejected', JSON.stringify(message))
    return { ok: false, error: message.status || json.response_msg || 'ClickSend rejected the message' }
  }

  return { ok: true, messageId: message.message_id }
}
