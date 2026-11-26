import type { Lifetime } from 'earshot'
import type { CalendarAccount } from '../messenger.ts'

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

export interface GoogleAccount extends CalendarAccount {
  token(signal: AbortSignal): Promise<string>
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
  const listeners = new Set<() => void>()
  let verifier: string | null = null
  const tell = () => {
    for (const told of [...listeners]) told()
  }
  const post = (path: string, body: unknown, signal: AbortSignal) =>
    ask(`${relay}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal })
  const kept = async () => parsed(await life.guard(place.load()))
  const keep = async (next: Kept | null) => {
    await life.guard(place.save(next === null ? null : JSON.stringify(next)))
    tell()
  }

  return {
    known: async () => (await life.guard(kept())) !== null,
    begin: async () => {
      const secret = url64(crypto.getRandomValues(new Uint8Array(32)))
      const hash = await life.guard(crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)))
      verifier = secret
      return `${relay}/google/start?pair=${url64(new Uint8Array(hash))}`
    },
    finish: async (code, signal) => {
      const secret = verifier
      if (secret === null) return false
      const response = await life.guard(post('/google/pickup', { verifier: secret, code: code.replace(/\D/g, '') }, signal))
      if (response.status === 403 || response.status === 404) {
        if (verifier === secret) verifier = null
        return false
      }
      if (!response.ok) throw new Error('The sign-in could not be picked up')
      const given = (await life.guard(response.json())) as { refresh?: unknown; access?: unknown; expires?: unknown }
      if (typeof given.refresh !== 'string' || typeof given.access !== 'string') throw new Error('The sign-in could not be picked up')
      if (verifier === secret) verifier = null
      await life.guard(keep({ refresh: given.refresh, access: given.access, until: now() + (Number(given.expires) || 0) * 1000 }))
      return true
    },
    token: async signal => {
      const have = await life.guard(kept())
      if (have === null) throw new GoogleEnded()
      if (have.until - now() > EARLY_MS) return have.access
      const response = await life.guard(post('/google/refresh', { refresh: have.refresh }, signal))
      if (response.status === 401) {
        await life.guard(keep(null))
        throw new GoogleEnded()
      }
      if (!response.ok) throw new Error('The sign-in could not be renewed')
      const given = (await life.guard(response.json())) as { access?: unknown; expires?: unknown }
      if (typeof given.access !== 'string') throw new Error('The sign-in could not be renewed')
      await life.guard(place.save(JSON.stringify({ ...have, access: given.access, until: now() + (Number(given.expires) || 0) * 1000 })))
      return given.access
    },
    signOut: async () => {
      const have = await life.guard(kept())
      await life.guard(keep(null))
      if (have === null) return
      const form = new URLSearchParams({ token: have.refresh })
      await life.guard(ask(REVOKE, { method: 'POST', body: form, signal: life.signal }).catch(() => null))
    },
    onChange: told => {
      listeners.add(told)
      return () => void listeners.delete(told)
    },
  }
}
