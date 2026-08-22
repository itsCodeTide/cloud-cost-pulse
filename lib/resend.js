const RESEND_URL = 'https://api.resend.com/emails'

export class ResendRequestError extends Error {
  constructor(status, type, message) {
    super(message)
    this.name = 'ResendRequestError'
    this.status = status
    this.type = type
  }
}

export async function sendResendEmail({ apiKey, from, to, subject, html, idempotencyKey }) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new ResendRequestError(401, 'missing_api_key', 'No Resend API key is configured')
  }

  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })

  let body = {}
  try {
    body = await response.json()
  } catch {
    // keep a safe generic error if Resend returns non-JSON
  }

  if (!response.ok) {
    throw new ResendRequestError(
      response.status,
      body.name || body.type || 'resend_error',
      body.message || 'Resend rejected the email'
    )
  }

  return body // { id: '...' }
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[char]))
}
