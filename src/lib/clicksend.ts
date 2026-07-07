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

  const message = json?.data?.messages?.[0]

  if (!res.ok || !json || json.response_code !== 'SUCCESS' || !message || message.status !== 'SUCCESS') {
    return { ok: false, error: json?.response_msg ?? `ClickSend request failed (${res.status})` }
  }

  return { ok: true, messageId: message.message_id }
}
