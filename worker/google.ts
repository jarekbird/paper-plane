export interface Pairs {
  put(pair: string, value: string, options: { expirationTtl: number }): Promise<void>
  take(pair: string): Promise<string | null>
}

export interface GoogleEnv {
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  PAIRS?: Pairs
}

export const KEEP_SECONDS = 300
const CONSENT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const PAIR = /^[A-Za-z0-9_-]{43}$/
const CODE = /^\d{6}$/
const MAX_BYTES = 4096
const ANY_PAGE = { 'access-control-allow-origin': '*' }

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...ANY_PAGE, 'content-type': 'application/json', 'cache-control': 'no-store' } })

const page = (status: number, title: string, text: string, code?: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Paper Plane</title><body style="font:18px/1.5 system-ui,sans-serif;margin:32px;max-width:28em"><h1 style="font-size:22px">${title}</h1><p>${text}</p>${code ? `<p style="font-size:40px;letter-spacing:6px;font-weight:600">${code}</p>` : ''}</body>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } },
  )

const NOT_CONNECTED = () => page(400, 'Not connected', 'Google Calendar was not connected. Go back to Paper Plane and start again.')

async function pairOf(verifier: string): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  return btoa(String.fromCharCode(...hash))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function typedCode(): string {
  const [number] = crypto.getRandomValues(new Uint32Array(1))
  return String(number % 1_000_000).padStart(6, '0')
}

async function sent(request: Request): Promise<Record<string, unknown> | null> {
  if (Number(request.headers.get('content-length')) > MAX_BYTES) return null
  const text = await request.text()
  if (text.length > MAX_BYTES) return null
  try {
    const body: unknown = JSON.parse(text)
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

async function tokens(env: Required<GoogleEnv>, grant: Record<string, string>): Promise<Record<string, unknown> | 'refused' | 'unreached'> {
  const response = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, ...grant }),
  }).catch(() => null)
  if (!response) return 'unreached'
  const answer: unknown = await response.json().catch(() => null)
  const given = answer && typeof answer === 'object' ? (answer as Record<string, unknown>) : null
  if (response.ok) return given ?? 'unreached'
  return response.status === 400 && given?.error === 'invalid_grant' ? 'refused' : 'unreached'
}

export async function google(request: Request, env: GoogleEnv): Promise<Response | null> {
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/google/')) return null
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PAIRS } = env
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !PAIRS) return json(404, { error: 'Google Calendar is not set up' })
  const set = { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PAIRS }
  const back = `${url.origin}/google/callback`

  if (request.method === 'GET' && url.pathname === '/google/start') {
    const pair = url.searchParams.get('pair') ?? ''
    if (!PAIR.test(pair)) return NOT_CONNECTED()
    const consent = new URL(CONSENT)
    consent.search = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: back,
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state: pair,
    }).toString()
    return new Response(null, { status: 302, headers: { location: consent.toString(), 'cache-control': 'no-store' } })
  }

  if (request.method === 'GET' && url.pathname === '/google/callback') {
    const pair = url.searchParams.get('state') ?? ''
    const code = url.searchParams.get('code') ?? ''
    if (!PAIR.test(pair) || !code) return NOT_CONNECTED()
    const given = await tokens(set, { grant_type: 'authorization_code', code, redirect_uri: back })
    if (typeof given === 'string' || typeof given.refresh_token !== 'string' || typeof given.access_token !== 'string')
      return NOT_CONNECTED()
    const typed = typedCode()
    await PAIRS.put(
      pair,
      JSON.stringify({ code: typed, refresh: given.refresh_token, access: given.access_token, expires: Number(given.expires_in) || 0 }),
      { expirationTtl: KEEP_SECONDS },
    )
    return page(
      200,
      'Almost there',
      'Go back to Paper Plane on your own phone and type this code. It works once, for five minutes. Give it to nobody: with it, someone else could see your calendar.',
      typed,
    )
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...ANY_PAGE,
        'access-control-allow-methods': 'POST',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '86400',
      },
    })
  }
  if (request.method !== 'POST') return json(404, { error: 'No such call' })
  const body = await sent(request)
  if (!body) return json(400, { error: 'Not a request this relay knows' })

  if (url.pathname === '/google/pickup') {
    const { verifier, code } = body
    if (typeof verifier !== 'string' || verifier.length > 200 || typeof code !== 'string' || !CODE.test(code))
      return json(400, { error: 'Not a code' })
    const pair = await pairOf(verifier)
    const kept = await PAIRS.take(pair)
    if (kept === null) return json(404, { error: 'No sign-in is waiting' })
    const waiting = JSON.parse(kept) as { code: string; refresh: string; access: string; expires: number }
    if (waiting.code !== code) return json(403, { error: 'That code is not right' })
    return json(200, { refresh: waiting.refresh, access: waiting.access, expires: waiting.expires })
  }

  if (url.pathname === '/google/refresh') {
    if (typeof body.refresh !== 'string' || body.refresh.length > 2048) return json(400, { error: 'Not a sign-in' })
    const given = await tokens(set, { grant_type: 'refresh_token', refresh_token: body.refresh })
    if (given === 'refused') return json(401, { error: 'Google has ended the sign-in' })
    if (given === 'unreached' || typeof given.access_token !== 'string') return json(502, { error: 'Google did not answer' })
    return json(200, { access: given.access_token, expires: Number(given.expires_in) || 0 })
  }
  return json(404, { error: 'No such call' })
}
