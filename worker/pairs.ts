import type { Pairs } from './google.ts'

export interface PairStorage {
  get(key: string): Promise<string | undefined>
  put(key: string, value: string): Promise<void>
  deleteAll(): Promise<void>
  setAlarm(at: number): Promise<void>
}

export interface PairNamespace {
  idFromName(name: string): unknown
  get(id: unknown): { fetch(input: string, init?: RequestInit): Promise<Response> }
}

const KEPT = 'kept'
const NONE = () => new Response(null, { status: 404 })

export class PairStore {
  readonly #storage: PairStorage
  #turn: Promise<unknown> = Promise.resolve()

  constructor(state: { storage: PairStorage }) {
    this.#storage = state.storage
  }

  fetch(request: Request): Promise<Response> {
    const answered = this.#turn.then(() => this.#answer(request))
    this.#turn = answered.catch(() => {})
    return answered
  }

  async #answer(request: Request): Promise<Response> {
    if (request.method === 'PUT') {
      const until = Date.now() + Number(new URL(request.url).searchParams.get('ttl')) * 1000
      await this.#storage.put(KEPT, JSON.stringify({ value: await request.text(), until }))
      await this.#storage.setAlarm(until)
      return new Response(null, { status: 204 })
    }
    if (request.method !== 'POST') return NONE()
    const kept = await this.#storage.get(KEPT)
    await this.#storage.deleteAll()
    if (kept === undefined) return NONE()
    const { value, until } = JSON.parse(kept) as { value: string; until: number }
    return Date.now() < until ? new Response(value) : NONE()
  }

  async alarm(): Promise<void> {
    await this.#storage.deleteAll()
  }
}

export function pairsIn(namespace: PairNamespace): Pairs {
  const of = (pair: string) => namespace.get(namespace.idFromName(pair))
  return {
    put: async (pair, value, { expirationTtl }) => {
      const stored = await of(pair).fetch(`https://pairs.invalid/?ttl=${expirationTtl}`, { method: 'PUT', body: value })
      if (!stored.ok) throw new Error('The sign-in could not be kept')
    },
    take: async pair => {
      const taken = await of(pair).fetch('https://pairs.invalid/', { method: 'POST' })
      return taken.ok ? taken.text() : null
    },
  }
}
