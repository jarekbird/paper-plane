import type { Lifetime, Store } from 'earshot'
import type { Chat, Messenger } from './messenger.ts'

export class Inbox {
  readonly #messenger: Messenger
  readonly #store: Store
  readonly #key: string
  readonly #listeners = new Set<() => void>()
  #chats: Chat[] = []
  #picks: string[] | null = null
  #loading: Promise<void> | null = null
  #again = false
  #problem: string | null = null

  constructor(life: Lifetime, messenger: Messenger, store: Store, owner = 'sample') {
    this.#messenger = messenger
    this.#store = store
    this.#key = `picks:${owner}`
    life.own(messenger.onChange(() => void this.refresh()))
  }

  get fresh(): boolean {
    return this.#picks === null
  }

  get problem(): string | null {
    return this.#problem
  }

  all(): readonly Chat[] {
    return this.#chats
  }

  picks(): readonly string[] {
    return this.#picks ?? []
  }

  picked(): Chat[] {
    const picks = this.picks()
    return this.#chats.filter(chat => picks.includes(chat.id))
  }

  chat(id: string): Chat | undefined {
    return this.#chats.find(chat => chat.id === id)
  }

  onChange(told: () => void): () => void {
    this.#listeners.add(told)
    return () => void this.#listeners.delete(told)
  }

  async start(): Promise<void> {
    const saved = await this.#store.get(this.#key).catch(() => null)
    this.#picks = saved === null ? null : parsePicks(saved)
    await this.refresh()
  }

  async pick(ids: readonly string[]): Promise<void> {
    this.#picks = [...ids]
    this.#tell()
    await this.#store.set(this.#key, JSON.stringify(this.#picks))
  }

  refresh(): Promise<void> {
    if (this.#loading) {
      this.#again = true
      return this.#loading
    }
    this.#loading = this.#load().finally(() => {
      this.#loading = null
      if (!this.#again) return
      this.#again = false
      void this.refresh()
    })
    return this.#loading
  }

  async #load(): Promise<void> {
    try {
      this.#chats = await this.#messenger.chats()
      this.#problem = null
    } catch {
      this.#problem = 'Telegram is not answering'
    }
    this.#tell()
  }

  #tell(): void {
    for (const listener of [...this.#listeners]) listener()
  }
}

function parsePicks(saved: string): string[] {
  try {
    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : []
  } catch {
    return []
  }
}
