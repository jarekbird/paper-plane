import { LifetimeEnded, type Lifetime } from 'earshot'
import type { CalendarAccount } from '../messenger.ts'

export type ConnectStep = 'checking' | 'off' | 'code' | 'on'

export interface ConnectView {
  step: ConnectStep
  busy: boolean
  link: string | null
  problem: string | null
}

const WRONG_CODE = 'That code is not right, or it is more than five minutes old. Start again.'
const NOT_REACHED = 'Could not reach the relay. Try again.'
const NOT_UNDONE =
  'Google Calendar is connected: the connection you left could not be undone, and Google could not be told. Disconnect if you did not mean to.'
const NOT_DISCONNECTED = 'Could not disconnect on this phone. Try again.'
const DISCONNECTED_HERE =
  'Disconnected on this phone, but the sign-in could not be fully removed and Google could not be told. End it in your Google account, under Security, Third-party access.'

export class Connect {
  readonly #life: Lifetime
  readonly #account: CalendarAccount
  readonly #listeners = new Set<() => void>()
  #view: ConnectView = { step: 'checking', busy: true, link: null, problem: null }
  #attempt = new AbortController()

  constructor(life: Lifetime, account: CalendarAccount) {
    this.#life = life
    this.#account = account
    life.own(() => this.#attempt.abort())
    life.own(account.onChange(() => void this.start()))
  }

  view(): ConnectView {
    return this.#view
  }

  onChange(told: () => void): () => void {
    this.#listeners.add(told)
    return () => void this.#listeners.delete(told)
  }

  async start(): Promise<void> {
    let known: boolean
    try {
      known = await this.#life.guard(this.#account.known())
    } catch (error) {
      if (error instanceof LifetimeEnded) return
      known = false
    }
    if (known) this.#show({ step: 'on', problem: this.#view.step === 'on' ? this.#view.problem : null })
    else if (this.#view.step !== 'code') this.#show({ step: 'off', problem: this.#view.step === 'on' ? null : this.#view.problem })
  }

  async begin(): Promise<void> {
    if ((this.#view.step !== 'off' && this.#view.step !== 'code') || this.#view.busy) return
    const attempt = this.#busy()
    try {
      const link = await this.#life.guard(this.#account.begin())
      if (!attempt.signal.aborted) this.#show({ step: 'code', link })
    } catch (error) {
      if (!(error instanceof LifetimeEnded) && !attempt.signal.aborted) this.#show({ step: 'off', problem: NOT_REACHED })
    }
  }

  async code(typed: string): Promise<void> {
    if (this.#view.step !== 'code' || this.#view.busy) return
    const link = this.#view.link
    const attempt = this.#busy()
    try {
      const connected = await this.#life.guard(this.#account.finish(typed, attempt.signal))
      if (attempt.signal.aborted) {
        if (connected) this.#stayed()
        return
      }
      this.#show(connected ? { step: 'on' } : { step: 'off', problem: WRONG_CODE })
    } catch (error) {
      if (!(error instanceof LifetimeEnded) && !attempt.signal.aborted) this.#show({ step: 'code', link, problem: NOT_REACHED })
    }
  }

  cancel(): void {
    if (this.#view.step !== 'code') return
    this.#attempt.abort()
    this.#show({ step: 'off' })
  }

  async disconnect(): Promise<void> {
    if (this.#view.step !== 'on' || this.#view.busy) return
    const life = this.#life
    const attempt = this.#busy()
    let left: 'ended' | 'here'
    try {
      left = await life.guard(this.#account.signOut())
    } catch (error) {
      if (!(error instanceof LifetimeEnded) && !attempt.signal.aborted) this.#show({ step: 'on', problem: NOT_DISCONNECTED })
      return
    }
    if (attempt.signal.aborted) return
    this.#show({ step: 'off', problem: left === 'here' ? DISCONNECTED_HERE : null })
  }

  #stayed(): void {
    this.#attempt.abort()
    this.#attempt = new AbortController()
    this.#show({ step: 'on', problem: NOT_UNDONE })
  }

  #busy(): AbortController {
    this.#attempt.abort()
    this.#attempt = new AbortController()
    this.#view = { ...this.#view, busy: true, problem: null }
    this.#tell()
    return this.#attempt
  }

  #show(next: Partial<ConnectView>): void {
    this.#view = { step: this.#view.step, link: null, problem: null, ...next, busy: false }
    this.#tell()
  }

  #tell(): void {
    for (const listener of [...this.#listeners]) listener()
  }
}
