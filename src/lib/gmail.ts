import { google } from 'googleapis'

export type GmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string }

function buildMimeMessage(opts: {
  from: string
  fromName?: string
  to: string
  toName?: string
  subject: string
  text: string
  html: string
}): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const fromHeader = opts.fromName ? `${opts.fromName} <${opts.from}>` : opts.from
  const toHeader = opts.toName ? `${opts.toName} <${opts.to}>` : opts.to

  return [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${opts.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    opts.text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    opts.html,
    '',
    `--${boundary}--`,
  ].join('\r\n')
}

function base64url(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Sends via the Gmail API, impersonating a real Google Workspace mailbox
// through domain-wide delegation — the email actually sends from that
// person's Workspace account (shows in their Sent folder, replies land in
// their inbox), not through a third-party transactional email service.
export async function sendGmailEmail(opts: {
  fromEmail: string
  fromName?: string
  toEmail: string
  toName?: string
  subject: string
  text: string
  html: string
}): Promise<GmailResult> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!clientEmail || !privateKeyRaw) {
    return {
      ok: false,
      error: 'Gmail is not configured — set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    }
  }

  // Vercel env vars store the PEM key with literal "\n" — convert back to real newlines
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n')

  try {
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
      subject: opts.fromEmail,
    })

    const gmail = google.gmail({ version: 'v1', auth })

    const raw = base64url(buildMimeMessage({
      from: opts.fromEmail,
      fromName: opts.fromName,
      to: opts.toEmail,
      toName: opts.toName,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    }))

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    })

    return { ok: true, messageId: res.data.id ?? '' }
  } catch (err) {
    console.error('[gmail] send failed', err)
    const message = err instanceof Error ? err.message : 'Failed to send email via Gmail'
    return { ok: false, error: message }
  }
}
