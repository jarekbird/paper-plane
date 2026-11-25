import type { Lifetime } from 'earshot'
import { tl } from '@mtcute/web'
import { SignInError, type Account, type SignInProblem } from '../messenger.ts'

export interface SessionPlace {
  load(): Promise<string | null>
  save(session: string | null): Promise<void>
}

export interface AuthClientLike {
  sendCode(params: { phone: string; abortSignal: AbortSignal }): Promise<{ phoneCodeHash: string } | { displayName: string }>
  signIn(params: { phone: string; phoneCodeHash: string; phoneCode: string }): Promise<{ displayName: string }>
  checkPassword(password: string): Promise<{ displayName: string }>
  logOut(): Promise<unknown>
  getMe(): Promise<{ displayName: string }>
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

  const entered = async (name: string): Promise<{ name: string }> => {
    pending = null
    const session = await life.guard(client.exportSession())
    await life.guard(place.save(session))
    await life.guard(client.startUpdatesLoop())
    return { name }
  }

  return {
    restore: async () => {
      const saved = await life.guard(place.load())
      if (saved === null) return null
      try {
        await life.guard(client.importSession(saved, true))
        const me = await life.guard(client.getMe())
        await life.guard(client.startUpdatesLoop())
        return me.displayName
      } catch (error) {
        if (!SIGNED_OUT.some(code => tl.RpcError.is(error, code))) throw error
        await life.guard(place.save(null))
        return null
      }
    },
    askCode: async phone => {
      try {
        const sent = await life.guard(client.sendCode({ phone, abortSignal: life.signal }))
        pending = 'phoneCodeHash' in sent ? { phone, hash: sent.phoneCodeHash } : null
      } catch (error) {
        throw problemOf(error)
      }
    },
    giveCode: async code => {
      if (!pending) throw new SignInError('expired')
      try {
        const me = await life.guard(client.signIn({ phone: pending.phone, phoneCodeHash: pending.hash, phoneCode: code }))
        return await life.guard(entered(me.displayName))
      } catch (error) {
        if (tl.RpcError.is(error, 'SESSION_PASSWORD_NEEDED')) return 'password'
        if (tl.RpcError.is(error, 'PHONE_CODE_EXPIRED')) pending = null
        throw problemOf(error)
      }
    },
    givePassword: async password => {
      try {
        const me = await life.guard(client.checkPassword(password))
        return await life.guard(entered(me.displayName))
      } catch (error) {
        throw problemOf(error)
      }
    },
    signOut: async () => {
      pending = null
      await life.guard(place.save(null))
      await life.guard(client.logOut())
    },
  }
}
