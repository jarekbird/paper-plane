import { LifetimeEnded, type Lifetime } from 'earshot'
import type { CalendarAccount } from '../messenger.ts'
import { turns } from '../turns.ts'

export interface GooglePlace {
  load(): Promise<string | null>
  save(kept: string | null): Promise<void>
}

export interface GoogleParts {
  relay: string
  place: GooglePlace
  ask?: typeof fetch
  now?: () => number
}

export interface GoogleKey {
  value: string
  of: number
}

export interface GoogleAccount extends CalendarAccount {
  signIn(): number
  token(of: number, signal: AbortSignal): Promise<GoogleKey>
  refused(key: GoogleKey, signal: AbortSignal): Promise<GoogleKey>
  drop(key: GoogleKey): Promise<void>
}

interface Kept {
  refresh: string
  access: string
  until: number
}

export class GoogleEnded extends Error {
  constructor() {
    super('The Google sign-in has ended')
  }
}

const REVOKE = 'https://oauth2.googleapis.com/revoke'
const EARLY_MS = 60_000

const url64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')

function parsed(text: string | null): Kept | null {
  if (text === null) return null
  try {
    const kept = JSON.parse(text) as Partial<Kept>
    return typeof kept.refresh === 'string' && typeof kept.access === 'string' && typeof kept.until === 'number' ? (kept as Kept) : null
  } catch {
    return null
  }
}

export function googleAccount(life: Lifetime, { relay, place, ask = fetch, now = Date.now }: GoogleParts): GoogleAccount {
  if (new URL(relay).protocol !== 'https:') throw new Error('The relay must be an https address')
  const inTurn = turns(life)
  const listeners = new Set<() => void>()
  let verifier: string | null = null
  let signIn = 0
  let renewing: { of: number; key: Promise<string> } | null = null
  const tell = () => {
    for (const told of [...listeners]) told()
  }
  const post = (path: string, body: unknown, signal: AbortSignal) =>
    ask(`${relay}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal })
  const current = () => inTurn(async () => ({ have: parsed(await life.guard(place.load())), of: signIn }))

  const forget = async (of: number): Promise<Kept | null> => {
    const had = await life.guard(
      inTurn(async () => {
        if (of !== signIn) return null
        const have = parsed(await life.guard(place.load()))
        await life.guard(place.save(null))
        signIn++
        return have
      }),
    )
    if (had) tell()
    return had
  }

  const revoke = (refresh: string) =>
    ask(REVOKE, { method: 'POST', body: new URLSearchParams({ token: refresh }), signal: life.signal }).catch(() => null)

  const renew = async (have: Kept, of: number, signal: AbortSignal): Promise<string> => {
    const response = await life.guard(post('/google/refresh', { refresh: have.refresh }, signal))
    if (response.status === 401) {
      await life.guard(forget(of))
      throw new GoogleEnded()
    }
    if (!response.ok) throw new Error('The sign-in could not be renewed')
    const given = (await life.guard(response.json())) as { access?: unknown; expires?: unknown }
    const access = given.access
    if (typeof access !== 'string') throw new Error('The sign-in could not be renewed')
    const kept = await life.guard(
      inTurn(async () => {
        if (of !== signIn) return false
        await life.guard(place.save(JSON.stringify({ ...have, access, until: now() + (Number(given.expires) || 0) * 1000 })))
        return true
      }),
    )
    if (!kept) throw new GoogleEnded()
    return access
  }

  const renewed = (have: Kept, of: number, signal: AbortSignal): Promise<string> => {
    if (renewing?.of === of) return renewing.key
    const once = async () => {
      try {
        return await life.guard(renew(have, of, signal))
      } finally {
        if (renewing?.of === of) renewing = null
      }
    }
    renewing = { of, key: once() }
    return renewing.key
  }

  return {
    known: async () => (await life.guard(current())).have !== null,
    begin: async () => {
      const secret = url64(crypto.getRandomValues(new Uint8Array(32)))
      const hash = await life.guard(crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)))
      verifier = secret
      return `${relay}/google/start?pair=${url64(new Uint8Array(hash))}`
    },
    finish: async (code, signal) => {
      const secret = verifier
      if (secret === null) return false
      signal.throwIfAborted()
      const response = await life.guard(post('/google/pickup', { verifier: secret, code: code.replace(/\D/g, '') }, signal))
      if (response.status === 403 || response.status === 404) {
        if (verifier === secret) verifier = null
        return false
      }
      if (!response.ok) throw new Error('The sign-in could not be picked up')
      const given = (await life.guard(response.json())) as { refresh?: unknown; access?: unknown; expires?: unknown }
      const { refresh, access } = given
      if (typeof refresh !== 'string' || typeof access !== 'string') throw new Error('The sign-in could not be picked up')
      if (verifier === secret) verifier = null
      const kept = await life.guard(
        inTurn(async () => {
          if (signal.aborted) return 'left'
          try {
            await life.guard(place.save(JSON.stringify({ refresh, access, until: now() + (Number(given.expires) || 0) * 1000 })))
          } catch (error) {
            if (error instanceof LifetimeEnded) throw error
            return 'unkept'
          }
          signIn++
          return 'kept'
        }),
      )
      if (kept === 'kept') {
        tell()
        return true
      }
      await life.guard(revoke(refresh))
      if (kept === 'left') return signal.throwIfAborted() as never
      throw new Error('The sign-in could not be kept on this phone')
    },
    signIn: () => signIn,
    token: async (asked, signal) => {
      const { have, of } = await life.guard(current())
      if (have === null || of !== asked) throw new GoogleEnded()
      if (have.until - now() > EARLY_MS) return { value: have.access, of }
      return { value: await life.guard(renewed(have, of, signal)), of }
    },
    refused: async (key, signal) => {
      const { have, of } = await life.guard(current())
      if (have === null || of !== key.of) throw new GoogleEnded()
      if (have.access !== key.value) return { value: have.access, of }
      return { value: await life.guard(renewed(have, of, signal)), of }
    },
    drop: async key => {
      await life.guard(forget(key.of))
    },
    signOut: async () => {
      const had = await life.guard(forget(signIn))
      if (had !== null) await life.guard(revoke(had.refresh))
    },
    onChange: told => {
      listeners.add(told)
      return () => void listeners.delete(told)
    },
  }
}
