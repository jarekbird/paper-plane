import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { google, KEEP_SECONDS, type Pairs } from './google.ts'
import worker from './worker.ts'

const VERIFIER = 'a-secret-only-the-phone-knows-0123456789'
const SECRET = 'GOCSPX-made-up-secret'

const pairOf = async (verifier: string) => {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  return btoa(String.fromCharCode(...hash))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

const PAIR = await pairOf(VERIFIER)

function pairs() {
  const kept = new Map<string, { value: string; ttl: number }>()
  const store: Pairs = {
    put: async (key, value, options) => void kept.set(key, { value, ttl: options.expirationTtl }),
    take: async key => {
      const found = kept.get(key)?.value ?? null
      kept.delete(key)
      return found
    },
  }
  return { store, kept }
}

function world() {
  const kv = pairs()
  const env = { GOOGLE_CLIENT_ID: 'client-id.apps.example', GOOGLE_CLIENT_SECRET: SECRET, PAIRS: kv.store }
  const asked: { url: string; body: Record<string, string> }[] = []
  let answer: () => Response = () => Response.json({ access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3599 })
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    asked.push({ url: String(input), body: Object.fromEntries(new URLSearchParams(String(init?.body))) })
    return answer()
  })
  const get = (path: string) => google(new Request(`https://relay.example${path}`), env)
  const post = (path: string, body: unknown) =>
    google(
      new Request(`https://relay.example${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      env,
    )
  const signedIn = async () => {
    const shown = await (await get(`/google/callback?state=${PAIR}&code=one-time-code`))!.text()
    return /(\d{6})/.exec(shown.replace(/<style[^>]*>/g, ''))![1]
  }
  return { env, kv, asked, get, post, signedIn, google: (next: () => Response) => void (answer = next) }
}

afterEach(() => void vi.unstubAllGlobals())

describe('signing in to Google through the Worker', () => {
  it('uses a pair that is the hash of the phone’s secret, so the link alone picks up nothing', () => {
    expect(PAIR).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(PAIR).not.toContain(VERIFIER)
  })

  it('sends the browser to Google’s consent page, asking for calendar events only, to come back here', async () => {
    const { get } = world()
    const response = (await get(`/google/start?pair=${PAIR}`))!
    const to = new URL(response.headers.get('location')!)
    expect(response.status).toBe(302)
    expect(`${to.origin}${to.pathname}`).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(Object.fromEntries(to.searchParams)).toEqual({
      client_id: 'client-id.apps.example',
      redirect_uri: 'https://relay.example/google/callback',
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state: PAIR,
    })
  })

  it('starts nothing for a pair that is not one', async () => {
    const { get, asked } = world()
    expect((await get('/google/start?pair=short'))!.status).toBe(400)
    expect((await get('/google/callback?state=short&code=x'))!.status).toBe(400)
    expect(asked).toEqual([])
  })

  it('S3: trades Google’s code for the sign-in with the secret only it holds, and shows the user a code to type, not the sign-in', async () => {
    const { get, asked, kv } = world()
    const response = (await get(`/google/callback?state=${PAIR}&code=one-time-code`))!
    const shown = await response.text()
    expect(asked).toEqual([
      {
        url: 'https://oauth2.googleapis.com/token',
        body: {
          client_id: 'client-id.apps.example',
          client_secret: SECRET,
          grant_type: 'authorization_code',
          code: 'one-time-code',
          redirect_uri: 'https://relay.example/google/callback',
        },
      },
    ])
    expect(shown).toMatch(/>\d{6}</)
    expect(shown).toMatch(/on your own phone.*Give it to nobody/)
    for (const secret of [SECRET, 'access-1', 'refresh-1', PAIR]) expect(shown).not.toContain(secret)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect([...kv.kept.keys()]).toEqual([PAIR])
  })

  it('S7: keeps the sign-in for five minutes, under the pair, and nothing else', async () => {
    const { signedIn, kv } = world()
    await signedIn()
    expect(KEEP_SECONDS).toBe(300)
    expect([...kv.kept.values()].map(entry => entry.ttl)).toEqual([300])
    expect(Object.keys(JSON.parse(kv.kept.get(PAIR)!.value)).sort()).toEqual(['access', 'code', 'expires', 'refresh'])
  })

  it('keeps nothing when Google refuses, or gives no lasting sign-in', async () => {
    const made = world()
    made.google(() => Response.json({ error: 'invalid_grant' }, { status: 400 }))
    expect((await made.get(`/google/callback?state=${PAIR}&code=x`))!.status).toBe(400)
    made.google(() => Response.json({ access_token: 'access-1', expires_in: 3599 }))
    expect((await made.get(`/google/callback?state=${PAIR}&code=x`))!.status).toBe(400)
    expect((await made.get(`/google/callback?state=${PAIR}&error=access_denied`))!.status).toBe(400)
    expect(made.kv.kept.size).toBe(0)
  })

  it('S7: hands the sign-in to the phone once, for the phone’s secret and the code the user typed, and then has it no more', async () => {
    const { post, signedIn, kv } = world()
    const code = await signedIn()
    const first = (await post('/google/pickup', { verifier: VERIFIER, code }))!
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ refresh: 'refresh-1', access: 'access-1', expires: 3599 })
    expect(kv.kept.size).toBe(0)
    expect((await post('/google/pickup', { verifier: VERIFIER, code }))!.status).toBe(404)
  })

  it('S7: gives nothing for a wrong code, and no second try: the sign-in is gone', async () => {
    const { post, signedIn, kv } = world()
    const code = await signedIn()
    const wrong = code === '000000' ? '000001' : '000000'
    expect((await post('/google/pickup', { verifier: VERIFIER, code: wrong }))!.status).toBe(403)
    expect(kv.kept.size).toBe(0)
    expect((await post('/google/pickup', { verifier: VERIFIER, code }))!.status).toBe(404)
  })

  it('gives nothing to someone who has the link and the code but not the phone’s secret', async () => {
    const { post, signedIn, kv } = world()
    const code = await signedIn()
    expect((await post('/google/pickup', { verifier: PAIR, code }))!.status).toBe(404)
    expect((await post('/google/pickup', { verifier: 'guess', code }))!.status).toBe(404)
    expect(kv.kept.size).toBe(1)
  })

  it('refuses a pick-up that is not a secret and six digits', async () => {
    const { post } = world()
    for (const body of [{}, { verifier: VERIFIER }, { verifier: VERIFIER, code: '12345' }, { verifier: 7, code: '123456' }, 'text'])
      expect((await post('/google/pickup', body))!.status).toBe(400)
  })

  it('S3: renews the sign-in with its secret and gives back only the new key to the calendar', async () => {
    const made = world()
    made.google(() => Response.json({ access_token: 'access-2', expires_in: 3599, scope: 'x', token_type: 'Bearer' }))
    const response = (await made.post('/google/refresh', { refresh: 'refresh-1' }))!
    expect(made.asked[0].body).toEqual({
      client_id: 'client-id.apps.example',
      client_secret: SECRET,
      grant_type: 'refresh_token',
      refresh_token: 'refresh-1',
    })
    const text = await response.text()
    expect(JSON.parse(text)).toEqual({ access: 'access-2', expires: 3599 })
    expect(text).not.toContain(SECRET)
    expect(made.kv.kept.size).toBe(0)
  })

  it('says so when Google no longer renews the sign-in, without Google’s own words', async () => {
    const made = world()
    made.google(() => Response.json({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }, { status: 400 }))
    const response = (await made.post('/google/refresh', { refresh: 'refresh-1' }))!
    expect(response.status).toBe(401)
    expect(await response.text()).not.toMatch(/invalid_grant|revoked/)
  })

  it('answers the app’s page from any origin, and its preflight', async () => {
    const { env, post } = world()
    const preflight = (await google(new Request('https://relay.example/google/pickup', { method: 'OPTIONS' }), env))!
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-origin')).toBe('*')
    expect((await post('/google/pickup', {}))!.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('A8: is not there at all until Google is set up, and leaves every other call to the voice relay', async () => {
    const { env } = world()
    const bare = { GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', PAIRS: env.PAIRS }
    expect((await google(new Request(`https://relay.example/google/start?pair=${PAIR}`), bare))!.status).toBe(404)
    expect(await google(new Request('https://relay.example/api/v1/chat/completions'), env)).toBeNull()
    const relayed = await worker.fetch(new Request('https://relay.example/api/v1/credits', { method: 'POST', body: '{}' }), {
      OPENROUTER_KEY: 'k',
      UPSTREAM: 'https://openrouter.ai',
    })
    expect(relayed.status).toBe(404)
  })

  it('S4, S7: logs nothing, and stores only through the pairs it was given', () => {
    const code = readFileSync(new URL('./google.ts', import.meta.url), 'utf8')
    expect(code).not.toMatch(/console|caches|D1|R2|Durable|waitUntil/)
    expect(code.match(/PAIRS\.\w+\(/g)).toEqual(['PAIRS.put(', 'PAIRS.take('])
  })
})
