import type { Store } from 'earshot'

const KEY = 'phrases'
const MOST = 12
const LONGEST = 120

export class Phrases {
  readonly #store: Store
  readonly #listeners = new Set<() => void>()
  #phrases: string[] = []

  constructor(store: Store) {
    this.#store = store
  }

  list(): readonly string[] {
    return this.#phrases
  }

  onChange(told: () => void): () => void {
    this.#listeners.add(told)
    return () => void this.#listeners.delete(told)
  }

  async start(): Promise<void> {
    const saved = await this.#store.get(KEY).catch(() => null)
    this.#phrases = saved === null ? [] : parse(saved)
    this.#tell()
  }

  add(phrase: string): Promise<void> {
    const text = phrase.trim().replace(/\s+/g, ' ').slice(0, LONGEST)
    if (!text || this.#phrases.length >= MOST || this.#phrases.some(known => known.toLowerCase() === text.toLowerCase()))
      return Promise.resolve()
    return this.#save([...this.#phrases, text])
  }

  remove(phrase: string): Promise<void> {
    return this.#save(this.#phrases.filter(known => known !== phrase))
  }

  #save(phrases: string[]): Promise<void> {
    this.#phrases = phrases
    this.#tell()
    return this.#store.set(KEY, JSON.stringify(phrases))
  }

  #tell(): void {
    for (const listener of [...this.#listeners]) listener()
  }
}

function parse(saved: string): string[] {
  try {
    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed.filter(phrase => typeof phrase === 'string').slice(0, MOST) : []
  } catch {
    return []
  }
}
