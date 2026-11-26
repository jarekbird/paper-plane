import { LifetimeEnded, type Lifetime } from 'earshot'
import type { Calendar, Meeting } from './messenger.ts'

export const AGENDA_MS = 300_000
const SOON_MS = 60_000

export class Agenda {
  readonly #life: Lifetime
  readonly #calendar: Calendar
  readonly #now: () => number
  readonly #listeners = new Set<() => void>()
  #next: Meeting | null = null
  #asked = 0

  constructor(life: Lifetime, calendar: Calendar, now: () => number = Date.now) {
    this.#life = life
    this.#calendar = calendar
    this.#now = now
    life.interval(() => void this.refresh(), AGENDA_MS)
    life.interval(() => this.#pass(), SOON_MS)
  }

  next(): Meeting | null {
    return this.#next && this.#next.end > this.#now() ? this.#next : null
  }

  onChange(told: () => void): () => void {
    this.#listeners.add(told)
    return () => void this.#listeners.delete(told)
  }

  async refresh(): Promise<void> {
    const life = this.#life
    if (life.ended) return
    const turn = ++this.#asked
    let found: Meeting | null
    try {
      found = await life.guard(this.#calendar.next(this.#now(), life.signal))
    } catch (error) {
      if (error instanceof LifetimeEnded) return
      found = null
    }
    if (turn !== this.#asked) return
    this.#next = found
    this.#tell()
  }

  #pass(): void {
    if (!this.#next) return
    if (this.#next.end <= this.#now()) void this.refresh()
    else this.#tell()
  }

  #tell(): void {
    for (const listener of [...this.#listeners]) listener()
  }
}
