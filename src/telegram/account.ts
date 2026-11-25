import { LifetimeEnded, type Lifetime } from 'earshot'
import { tl } from '@mtcute/web'
import { SignInError, type Account, type SignInProblem, type Who } from '../messenger.ts'

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
const SIGNED_OUT = ['AUTH_KEY_UNREGISTERED', 'SESSION_REVOKED', 'USER_DEACTIVATED']

function problemOf(error: unknown): SignInError {
  if (error instanceof SignInError) return error
  for (const [code, problem] of PROBLEMS) if (tl.RpcError.is(error, code)) return new SignInError(problem)
  return new SignInError('other')
}

export function accountOver(life: Lifetime, client: AuthClientLike, place: SessionPlace): Account {
  let pending: { phone: string; hash: string } | null = null

  const forget = async () => {
    await life.guard(place.save(null).catch(() => {}))
    await life.guard(Promise.resolve(client.logOut()).catch(() => {}))
  }

  const entered = async (user: UserLike, signal: AbortSignal): Promise<Who> => {
    const left = async (): Promise<never> => {
      await life.guard(forget())
      return signal.throwIfAborted() as never
    }
    try {
      if (signal.aborted) return await life.guard(left())
      const session = await life.guard(client.exportSession())
      if (signal.aborted) return await life.guard(left())
      await life.guard(place.save(session))
      if (signal.aborted) return await life.guard(left())
      await life.guard(client.startUpdatesLoop())
      if (signal.aborted) return await life.guard(left())
    } catch (error) {
      if (error instanceof LifetimeEnded || signal.aborted) throw error
      await life.guard(forget())
      throw new SignInError('other')
    }
    pending = null
    return { id: String(user.id), name: user.displayName }
  }

  return {
    known: async () => (await life.guard(place.load())) !== null,
    restore: async () => {
      const saved = await life.guard(place.load())
      if (saved === null) return null
      try {
        await life.guard(client.importSession(saved, true))
        const me = await life.guard(client.getMe())
        await life.guard(client.startUpdatesLoop())
        return { id: String(me.id), name: me.displayName }
      } catch (error) {
        if (!SIGNED_OUT.some(code => tl.RpcError.is(error, code))) throw error
        await life.guard(place.save(null))
        return null
      }
    },
    askCode: async (phone, signal) => {
      try {
        const sent = await life.guard(client.sendCode({ phone, abortSignal: signal }))
        pending = 'phoneCodeHash' in sent ? { phone, hash: sent.phoneCodeHash } : null
      } catch (error) {
        throw problemOf(error)
      }
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
      let removed = true
      try {
        await life.guard(place.save(null))
      } catch (error) {
        if (error instanceof LifetimeEnded) throw error
        removed = false
      }
      try {
        await life.guard(client.logOut())
        return 'told'
      } catch (error) {
        if (error instanceof LifetimeEnded || !removed) throw error
        return 'untold'
      }
    },
  }
}
