import { LifetimeEnded, type Lifetime } from 'earshot'
import { SignInError, type Account, type SignInProblem } from '../messenger.ts'

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

export class SignIn {
  readonly #life: Lifetime
  readonly #account: Account
  readonly #listeners = new Set<() => void>()
  readonly #changed: (signedIn: boolean) => void
  #view: SignInView = { step: 'checking', busy: true, problem: null, name: null }
  #turn = 0

  constructor(life: Lifetime, account: Account, changed: (signedIn: boolean) => void) {
    this.#life = life
    this.#account = account
    this.#changed = changed
  }

  view(): SignInView {
    return this.#view
  }

  onChange(told: () => void): () => void {
    this.#listeners.add(told)
    return () => void this.#listeners.delete(told)
  }

  async start(): Promise<boolean> {
    const restored = await this.#run(() => this.#account.restore(), 'offline')
    if (!restored) return false
    this.#show(restored.done === null ? { step: 'phone' } : { step: 'in', name: restored.done })
    return restored.done !== null
  }

  async retry(): Promise<void> {
    if (this.#view.step !== 'offline' || this.#view.busy) return
    if (await this.start()) this.#changed(true)
  }

  async phone(number: string): Promise<void> {
    if (this.#view.step !== 'phone' || this.#view.busy) return
    if (number.trim() === '') return this.#show({ problem: PROBLEMS.phone })
    const asked = await this.#run(() => this.#account.askCode(number.trim()), 'phone')
    if (asked) this.#show({ step: 'code' })
  }

  async code(code: string): Promise<void> {
    if (this.#view.step !== 'code' || this.#view.busy) return
    const given = await this.#run(() => this.#account.giveCode(code.trim()), 'code')
    if (!given) return
    if (given.done === 'password') return this.#show({ step: 'password' })
    this.#entered(given.done.name)
  }

  async password(password: string): Promise<void> {
    if (this.#view.step !== 'password' || this.#view.busy) return
    const given = await this.#run(() => this.#account.givePassword(password), 'password')
    if (given) this.#entered(given.done.name)
  }

  another(): void {
    if (this.#view.step !== 'code' && this.#view.step !== 'password') return
    this.#turn++
    this.#show({ step: 'phone' })
  }

  async signOut(): Promise<void> {
    if (this.#view.step !== 'in' || this.#view.busy) return
    const turn = ++this.#turn
    this.#view = { ...this.#view, busy: true, problem: null }
    this.#tell()
    let told = true
    try {
      await this.#life.guard(this.#account.signOut())
    } catch (error) {
      if (error instanceof LifetimeEnded) return
      told = false
    }
    if (turn !== this.#turn) return
    this.#show({ step: 'phone', problem: told ? null : SIGNED_OUT_HERE })
    this.#changed(false)
  }

  #entered(name: string): void {
    this.#show({ step: 'in', name })
    this.#changed(true)
  }

  async #run<T>(work: () => Promise<T>, from: SignInStep): Promise<{ done: T } | null> {
    const turn = ++this.#turn
    this.#view = { ...this.#view, busy: true, problem: null }
    this.#tell()
    try {
      const done = await this.#life.guard(work())
      return turn === this.#turn ? { done } : null
    } catch (error) {
      if (error instanceof LifetimeEnded || turn !== this.#turn) return null
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
