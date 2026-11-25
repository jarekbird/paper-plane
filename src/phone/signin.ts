import { LifetimeEnded, type Lifetime } from 'earshot'
import { SignInError, type Account, type SignInProblem, type Who } from '../messenger.ts'

export type SignInStep = 'checking' | 'offline' | 'phone' | 'code' | 'password' | 'in'

export interface SignInView {
  step: SignInStep
  busy: boolean
  problem: string | null
  name: string | null
}

const PROBLEMS: Record<SignInProblem, string> = {
  phone: 'Check the number. It needs its country code, like +1.',
  code: 'That code is not right.',
  expired: 'That code is no longer good. Ask for a new one.',
  password: 'That password is not right.',
  wait: 'Telegram asks you to wait a while before trying again.',
  other: 'Could not reach Telegram. Try again.',
}
const SIGNED_OUT_HERE = 'Signed out on this phone. Telegram could not be told: end this session in Telegram, under Devices.'
const ENDED = 'Your Telegram sign-in has ended. Sign in again.'
const NOT_UNDONE = 'You are signed in: the sign-in you left could not be undone. Sign out if you did not mean to.'
const NOT_SIGNED_OUT = 'Could not sign out on this phone. Try again.'

export class SignIn {
  readonly #life: Lifetime
  readonly #account: Account
  readonly #listeners = new Set<() => void>()
  readonly #changed: (who: Who | null) => void
  #view: SignInView = { step: 'checking', busy: true, problem: null, name: null }
  #attempt = new AbortController()

  constructor(life: Lifetime, account: Account, changed: (who: Who | null) => void) {
    this.#life = life
    this.#account = account
    this.#changed = changed
    life.own(() => this.#attempt.abort())
  }

  view(): SignInView {
    return this.#view
  }

  onChange(told: () => void): () => void {
    this.#listeners.add(told)
    return () => void this.#listeners.delete(told)
  }

  async start(kept = false): Promise<Who | null> {
    const restored = await this.#run(() => this.#account.restore(), 'offline')
    if (!restored) return null
    this.#show(restored.done === null ? { step: 'phone', problem: kept ? ENDED : null } : { step: 'in', name: restored.done.name })
    return restored.done
  }

  async retry(): Promise<void> {
    if (this.#view.step !== 'offline' || this.#view.busy) return
    const who = await this.start(true)
    if (who || this.view().step === 'phone') this.#changed(who)
  }

  async phone(number: string): Promise<void> {
    if (this.#view.step !== 'phone' || this.#view.busy) return
    if (number.trim() === '') return this.#show({ problem: PROBLEMS.phone })
    const asked = await this.#run(signal => this.#account.askCode(number.trim(), signal), 'phone', true)
    if (!asked) return
    if (asked.done === 'code') return this.#show({ step: 'code' })
    this.#entered(asked.done)
  }

  async code(code: string): Promise<void> {
    if (this.#view.step !== 'code' || this.#view.busy) return
    const given = await this.#run(signal => this.#account.giveCode(code.trim(), signal), 'code', true)
    if (!given) return
    if (given.done === 'password') return this.#show({ step: 'password' })
    this.#entered(given.done)
  }

  async password(password: string): Promise<void> {
    if (this.#view.step !== 'password' || this.#view.busy) return
    const given = await this.#run(signal => this.#account.givePassword(password, signal), 'password', true)
    if (given) this.#entered(given.done)
  }

  another(): void {
    if (this.#view.step !== 'code' && this.#view.step !== 'password') return
    this.#attempt.abort()
    this.#show({ step: 'phone' })
  }

  async signOut(): Promise<void> {
    if (this.#view.step !== 'in' || this.#view.busy) return
    const attempt = this.#begin()
    let told: 'told' | 'untold'
    try {
      told = await this.#life.guard(this.#account.signOut())
    } catch (error) {
      if (error instanceof LifetimeEnded || attempt.signal.aborted) return
      return this.#show({ step: 'in', name: this.#view.name, problem: NOT_SIGNED_OUT })
    }
    if (attempt.signal.aborted) return
    this.#show({ step: 'phone', problem: told === 'told' ? null : SIGNED_OUT_HERE })
    this.#changed(null)
  }

  #stayed(who: Who): void {
    this.#attempt.abort()
    this.#attempt = new AbortController()
    this.#show({ step: 'in', name: who.name, problem: NOT_UNDONE })
    this.#changed(who)
  }

  #entered(who: Who): void {
    this.#show({ step: 'in', name: who.name })
    this.#changed(who)
  }

  #begin(): AbortController {
    this.#attempt.abort()
    this.#attempt = new AbortController()
    this.#view = { ...this.#view, busy: true, problem: null }
    this.#tell()
    return this.#attempt
  }

  async #run<T>(work: (signal: AbortSignal) => Promise<T>, from: SignInStep, signsIn = false): Promise<{ done: T } | null> {
    const attempt = this.#begin()
    try {
      const done = await this.#life.guard(work(attempt.signal))
      if (!attempt.signal.aborted) return { done }
      if (signsIn && typeof done === 'object' && done !== null && 'id' in done) this.#stayed(done as unknown as Who)
      return null
    } catch (error) {
      if (error instanceof LifetimeEnded || attempt.signal.aborted) return null
      const problem = error instanceof SignInError ? error.problem : 'other'
      this.#show({ step: problem === 'expired' ? 'phone' : from, name: this.#view.name, problem: PROBLEMS[problem] })
      return null
    }
  }

  #show(next: Partial<SignInView>): void {
    this.#view = { step: this.#view.step, name: null, problem: null, ...next, busy: false }
    this.#tell()
  }

  #tell(): void {
    for (const listener of [...this.#listeners]) listener()
  }
}
