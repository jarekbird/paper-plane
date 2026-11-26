import { LifetimeEnded, type Lifetime } from 'earshot'
import { tl } from '@mtcute/core'
import { SignInError, type Account, type SignInProblem, type Who } from '../messenger.ts'
import type { SignedIn } from './messenger.ts'
import { ANSWER_MS, answerWithin, signedOut } from './trouble.ts'

export interface SessionPlace {
  load(): Promise<string | null>
  save(session: string | null): Promise<void>
}

export interface UserLike {
  id: number
  displayName: string
}

export interface AuthClientLike {
  sendCode(params: { phone: string; abortSignal: AbortSignal }): Promise<{ phoneCodeHash: string } | UserLike>
  signIn(params: { phone: string; phoneCodeHash: string; phoneCode: string }): Promise<UserLike>
  checkPassword(password: string): Promise<UserLike>
  logOut(): Promise<unknown>
  getMe(): Promise<UserLike>
  exportSession(): Promise<string>
  importSession(session: string, force: boolean): Promise<void>
  startUpdatesLoop(): Promise<void>
  drop(): Promise<void>
}

const PROBLEMS: [code: string, problem: SignInProblem][] = [
  ['PHONE_NUMBER_INVALID', 'phone'],
  ['PHONE_NUMBER_BANNED', 'phone'],
  ['PHONE_CODE_INVALID', 'code'],
  ['PHONE_CODE_EMPTY', 'code'],
  ['PHONE_CODE_EXPIRED', 'expired'],
  ['PASSWORD_HASH_INVALID', 'password'],
  ['FLOOD_WAIT_%d', 'wait'],
  ['PHONE_PASSWORD_FLOOD', 'wait'],
]

function problemOf(error: unknown): SignInError {
  if (error instanceof SignInError) return error
  for (const [code, problem] of PROBLEMS) if (tl.RpcError.is(error, code)) return new SignInError(problem)
  return new SignInError('other')
}

export function accountOver(life: Lifetime, client: AuthClientLike, place: SessionPlace): Account & SignedIn {
  const within = answerWithin(life, ANSWER_MS)
  const listeners = new Set<() => void>()
  let pending: { phone: string; hash: string } | null = null
  let era = 0
  let inside = false
  let stale = false

  const forgotten = async (): Promise<boolean> => {
    if (stale) stale = !(await life.guard(done(() => place.save(null))))
    return !stale
  }

  const enter = (user: UserLike): Who => {
    era++
    inside = true
    return { id: String(user.id), name: user.displayName }
  }

  const end = async (at: number) => {
    if (!inside || at !== era) return
    const mine = ++era
    inside = false
    pending = null
    stale = true
    await life.guard(forgotten())
    await life.guard(done(() => client.drop()))
    if (era === mine) for (const told of [...listeners]) told()
  }

  const done = async (work: () => Promise<unknown>): Promise<boolean> => {
    try {
      await life.guard(work())
      return true
    } catch (error) {
      if (error instanceof LifetimeEnded) throw error
      return false
    }
  }

  const forget = async (): Promise<boolean> => {
    const removed = await life.guard(done(() => place.save(null)))
    const ended = await life.guard(done(async () => client.logOut()))
    if (removed && !ended) await life.guard(done(() => client.drop()))
    return removed || ended
  }

  const entered = async (user: UserLike, signal: AbortSignal): Promise<Who> => {
    let stored = false
    let failed = false
    try {
      if (!signal.aborted) {
        const session = await life.guard(client.exportSession())
        if (!signal.aborted) {
          await life.guard(place.save(session))
          stored = true
          stale = false
        }
        if (!signal.aborted) await life.guard(client.startUpdatesLoop())
      }
    } catch (error) {
      if (error instanceof LifetimeEnded) throw error
      failed = true
    }
    if (!failed && !signal.aborted) {
      pending = null
      return enter(user)
    }
    const gone = await life.guard(forget())
    if (!gone && stored) return enter(user)
    if (signal.aborted) return signal.throwIfAborted() as never
    throw new SignInError('other')
  }

  return {
    known: async () => (await life.guard(forgotten())) && (await life.guard(place.load())) !== null,
    restore: async () => {
      if (!(await life.guard(forgotten()))) return null
      const saved = await life.guard(place.load())
      if (saved === null) return null
      let me: UserLike
      try {
        await life.guard(within(() => client.importSession(saved, true)))
        me = await life.guard(within(() => client.getMe()))
        await life.guard(within(() => client.startUpdatesLoop()))
      } catch (error) {
        if (!signedOut(error)) throw error
        await life.guard(place.save(null))
        return null
      }
      return enter(me)
    },
    askCode: async (phone, signal) => {
      let sent: { phoneCodeHash: string } | UserLike
      try {
        sent = await life.guard(within(() => client.sendCode({ phone, abortSignal: signal })))
      } catch (error) {
        throw problemOf(error)
      }
      if (!('phoneCodeHash' in sent)) return life.guard(entered(sent, signal))
      pending = { phone, hash: sent.phoneCodeHash }
      return 'code'
    },
    giveCode: async (code, signal) => {
      if (!pending) throw new SignInError('expired')
      let user: UserLike
      try {
        user = await life.guard(client.signIn({ phone: pending.phone, phoneCodeHash: pending.hash, phoneCode: code }))
      } catch (error) {
        if (tl.RpcError.is(error, 'SESSION_PASSWORD_NEEDED')) return 'password'
        if (tl.RpcError.is(error, 'PHONE_CODE_EXPIRED')) pending = null
        throw problemOf(error)
      }
      return life.guard(entered(user, signal))
    },
    givePassword: async (password, signal) => {
      let user: UserLike
      try {
        user = await life.guard(client.checkPassword(password))
      } catch (error) {
        throw problemOf(error)
      }
      return life.guard(entered(user, signal))
    },
    signOut: async () => {
      pending = null
      const was = inside
      era++
      inside = false
      const removed = await life.guard(done(() => place.save(null)))
      const ended = await life.guard(done(async () => client.logOut()))
      if (ended) return 'told'
      if (!removed) {
        inside = was
        throw new SignInError('other')
      }
      await life.guard(done(() => client.drop()))
      return 'untold'
    },
    onEnded: told => {
      listeners.add(told)
      return () => void listeners.delete(told)
    },
    era: () => era,
    ended: at => void end(at).catch(() => {}),
  }
}
