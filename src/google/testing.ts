export interface GoogleSide {
  ask: typeof fetch
  asked: { host: string; path: string; method: string; body: unknown; bearer: string | null }[]
  consent(link: string): string
  end(): void
  expire(): void
  put(event: Record<string, unknown>): void
  events(): Record<string, unknown>[]
  revoked: string[]
}

const url64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

export function googleSide(): GoogleSide {
  const asked: GoogleSide['asked'] = []
  const revoked: string[] = []
  let waiting: { pair: string; code: string } | null = null
  let serial = 0
  let refresh: string | null = null
  let access = ''
  let events: Record<string, unknown>[] = []
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  const issue = () => (access = `access-${++serial}`)

  const ask: typeof fetch = async (input, init) => {
    const url = new URL(String(input))
    const method = init?.method ?? 'GET'
    const headers = new Headers(init?.headers)
    const text = typeof init?.body === 'string' ? init.body : init?.body instanceof URLSearchParams ? init.body.toString() : ''
    const body: unknown = headers.get('content-type') === 'application/json' ? JSON.parse(text) : text
    const bearer = headers.get('authorization')
    asked.push({ host: url.host, path: url.pathname, method, body, bearer })
    init?.signal?.throwIfAborted()
    if (url.host === 'relay.example' && url.pathname === '/google/pickup') {
      const sent = body as { verifier: string; code: string }
      const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sent.verifier)))
      if (!waiting || url64(hash) !== waiting.pair) return json(404, {})
      const right = waiting.code === sent.code
      waiting = null
      if (!right) return json(403, {})
      refresh = `refresh-${++serial}`
      return json(200, { refresh, access: issue(), expires: 3600 })
    }
    if (url.host === 'relay.example' && url.pathname === '/google/refresh') {
      if ((body as { refresh: string }).refresh !== refresh) return json(401, {})
      return json(200, { access: issue(), expires: 3600 })
    }
    if (url.host === 'oauth2.googleapis.com' && url.pathname === '/revoke') {
      revoked.push(new URLSearchParams(text).get('token') ?? '')
      refresh = null
      access = ''
      return json(200, {})
    }
    if (url.host !== 'www.googleapis.com' || !url.pathname.startsWith('/calendar/v3/calendars/primary/events')) return json(404, {})
    if (!access || bearer !== `Bearer ${access}`) return json(401, {})
    const id = decodeURIComponent(url.pathname.split('/events/')[1] ?? '')
    if (method === 'DELETE') {
      if (!events.some(event => event.id === id)) return json(410, {})
      events = events.filter(event => event.id !== id)
      return new Response(null, { status: 204 })
    }
    if (method === 'POST') {
      const made = { ...(body as object), id: `event-${++serial}`, status: 'confirmed' }
      events.push(made)
      return json(200, made)
    }
    const from = Date.parse(url.searchParams.get('timeMin') ?? '')
    const time = (event: Record<string, unknown>, edge: 'start' | 'end') => {
      const at = event[edge] as { dateTime?: string; date?: string }
      return Date.parse(at.dateTime ?? `${at.date}T00:00:00Z`)
    }
    const listed = events
      .filter(event => time(event, 'end') > from)
      .sort((a, b) => time(a, 'start') - time(b, 'start'))
      .slice(0, Number(url.searchParams.get('maxResults')))
    return json(200, { items: listed })
  }

  return {
    ask,
    asked,
    revoked,
    consent: link => {
      const pair = new URL(link).searchParams.get('pair') ?? ''
      waiting = { pair, code: '482913' }
      return waiting.code
    },
    end: () => {
      refresh = null
      access = ''
    },
    expire: () => {
      access = ''
    },
    put: event => void events.push(event),
    events: () => events,
  }
}
