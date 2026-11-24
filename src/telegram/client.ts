import type { Lifetime } from 'earshot'
import { MemoryStorage, TelegramClient, tl } from '@mtcute/web'
import type { Chat, Message, Messenger } from '../messenger.ts'
import { toChat, toMessage } from './map.ts'

export interface TelegramApp {
  apiId: number
  apiHash: string
  test?: boolean
}

export interface SessionPlace {
  load(): Promise<string | null>
  save(session: string | null): Promise<void>
}

export type SignInProblem = 'phone' | 'code' | 'expired' | 'password' | 'wait' | 'other'

export class SignInError extends Error {
  readonly problem: SignInProblem

  constructor(problem: SignInProblem) {
    super(problem)
    this.problem = problem
  }
}

export interface Telegram extends Messenger {
  restore(): Promise<string | null>
  askCode(phone: string): Promise<void>
  giveCode(code: string): Promise<{ name: string } | 'password'>
  givePassword(password: string): Promise<{ name: string }>
  signOut(): Promise<void>
}

const DIALOGS = 100
const CHANGES = new Set(['new_message', 'edit_message', 'delete_message', 'history_read'])

const PROBLEMS: [code: string, problem: SignInProblem][] = [
  ['PHONE_NUMBER_INVALID', 'phone'],
  ['PHONE_CODE_INVALID', 'code'],
  ['PHONE_CODE_EMPTY', 'code'],
  ['PHONE_CODE_EXPIRED', 'expired'],
  ['PASSWORD_HASH_INVALID', 'password'],
  ['FLOOD_WAIT_%d', 'wait'],
  ['PHONE_PASSWORD_FLOOD', 'wait'],
]

function problemOf(error: unknown): SignInError {
  for (const [code, problem] of PROBLEMS) if (tl.RpcError.is(error, code)) return new SignInError(problem)
  return new SignInError('other')
}

export function telegram(life: Lifetime, app: TelegramApp, place: SessionPlace): Telegram {
  const client = new TelegramClient({
    apiId: app.apiId,
    apiHash: app.apiHash,
    storage: new MemoryStorage(),
    ...(app.test ? { testMode: true } : {}),
  })
  const listeners = new Set<() => void>()
  let pending: { phone: string; hash: string } | null = null

  const tell = (update: { name: string }) => {
    if (!CHANGES.has(update.name)) return
    for (const listener of [...listeners]) listener()
  }
  client.onUpdate.add(tell)
  life.own(() => {
    client.onUpdate.remove(tell)
    void client.destroy()
  })

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
        if (!tl.RpcError.is(error, 'AUTH_KEY_UNREGISTERED') && !tl.RpcError.is(error, 'SESSION_REVOKED')) throw error
        await life.guard(place.save(null))
        return null
      }
    },
    askCode: async phone => {
      try {
        const sent = await life.guard(client.sendCode({ phone, abortSignal: life.signal }))
        if ('phoneCodeHash' in sent) pending = { phone, hash: sent.phoneCodeHash }
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
      await life.guard(place.save(null))
      await life.guard(client.logOut())
    },
    chats: async () => {
      const chats: Chat[] = []
      for await (const dialog of client.iterDialogs({ limit: DIALOGS, archived: 'exclude' })) chats.push(toChat(dialog))
      return chats
    },
    history: async (chat, limit) => {
      const newestFirst = await client.getHistory(Number(chat), { limit })
      return newestFirst
        .filter(message => !message.isService)
        .map(toMessage)
        .reverse()
    },
    send: async (chat, text): Promise<Message> => toMessage(await client.sendText(Number(chat), text)),
    read: chat => client.readHistory(Number(chat)),
    onChange: told => {
      listeners.add(told)
      return () => void listeners.delete(told)
    },
  }
}
