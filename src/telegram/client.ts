import type { Lifetime } from 'earshot'
import { MemoryStorage, TelegramClient } from '@mtcute/web'
import type { Account, Messenger } from '../messenger.ts'
import { accountOver, type AuthClientLike, type SessionPlace } from './account.ts'
import { messengerOver, type ClientLike } from './messenger.ts'

export interface TelegramApp {
  apiId: number
  apiHash: string
}

type Heard = (update: { name: string }) => void

export function telegram(life: Lifetime, app: TelegramApp, place: SessionPlace): { account: Account; messenger: Messenger } {
  const make = () => new TelegramClient({ apiId: app.apiId, apiHash: app.apiHash, storage: new MemoryStorage() })
  const heard = new Set<Heard>()
  let current = make()

  const live: AuthClientLike & ClientLike = {
    sendCode: params => current.sendCode(params),
    signIn: params => current.signIn(params),
    checkPassword: password => current.checkPassword(password),
    logOut: () => current.logOut(),
    getMe: () => current.getMe(),
    exportSession: () => current.exportSession(),
    importSession: (session, force) => current.importSession(session, force),
    startUpdatesLoop: () => current.startUpdatesLoop(),
    drop: async () => {
      const old = current
      for (const listener of heard) old.onUpdate.remove(listener)
      current = make()
      for (const listener of heard) current.onUpdate.add(listener)
      await old.destroy()
    },
    iterDialogs: params => current.iterDialogs(params),
    getHistory: (chat, params) => current.getHistory(chat, params),
    sendText: (chat, text) => current.sendText(chat, text),
    readHistory: chat => current.readHistory(chat),
    deleteMessagesById: (chat, ids, params) => current.deleteMessagesById(chat, ids, params),
    getPeerDialogs: chat => current.getPeerDialogs(chat),
    saveDraft: (chat, draft) => current.saveDraft(chat, draft),
    forwardMessagesById: params => current.forwardMessagesById(params),
    sendReaction: params => current.sendReaction(params),
    onUpdate: {
      add: listener => {
        heard.add(listener)
        current.onUpdate.add(listener)
      },
      remove: listener => {
        heard.delete(listener)
        current.onUpdate.remove(listener)
      },
    },
  }

  const messenger = messengerOver(live)
  life.own(() => {
    messenger.close()
    void current.destroy()
  })
  return { account: accountOver(life, live, place), messenger }
}
