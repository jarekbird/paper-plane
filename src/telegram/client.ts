import type { Lifetime } from 'earshot'
import type { tl } from '@mtcute/core'
import { BaseTelegramClient, TelegramClient } from '@mtcute/core/client.js'
import { randomLong } from '@mtcute/core/utils.js'
import type { Account, Messenger } from '../messenger.ts'
import { accountOver, type AuthClientLike, type SessionPlace } from './account.ts'
import { messengerOver, type ClientLike, type LinkState } from './messenger.ts'
import { clientOptions, type TelegramApp } from './options.ts'
import { ANSWER_MS, answerWithin } from './trouble.ts'

type Heard = (update: { name: string }) => void
type Linked = (state: LinkState) => void

export function telegram(life: Lifetime, app: TelegramApp, place: SessionPlace): { account: Account; messenger: Messenger } {
  const make = () => new TelegramClient({ client: new BaseTelegramClient(clientOptions(app)) })
  const heard = new Set<Heard>()
  const linked = new Set<Linked>()
  let current = make()

  const live: AuthClientLike & ClientLike<tl.Long> = {
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
      for (const listener of linked) old.onConnectionState.remove(listener)
      current = make()
      for (const listener of heard) current.onUpdate.add(listener)
      for (const listener of linked) current.onConnectionState.add(listener)
      await old.destroy()
    },
    iterDialogs: params => current.iterDialogs(params),
    getHistory: (chat, params) => current.getHistory(chat, params),
    randomId: () => randomLong(),
    sendText: (chat, text, params) => current.sendText(chat, text, params),
    readHistory: (chat, params) => current.readHistory(chat, params),
    deleteMessagesById: (chat, ids, params) => current.deleteMessagesById(chat, ids, params),
    getPeerDialogs: chat => current.getPeerDialogs(chat),
    saveDraft: (chat, draft) => current.saveDraft(chat, draft),
    forwardMessagesById: params => current.forwardMessagesById(params),
    sendReaction: params => current.sendReaction(params),
    sponsoredMessages: async (chat, signal) => {
      const peer = await current.resolvePeer(chat)
      signal.throwIfAborted()
      const answer = await current.call({ _: 'messages.getSponsoredMessages', peer }, { abortSignal: signal })
      return answer._ === 'messages.sponsoredMessages' ? answer.messages : []
    },
    viewSponsored: randomId => current.call({ _: 'messages.viewSponsoredMessage', randomId }),
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
    onConnectionState: {
      add: listener => {
        linked.add(listener)
        current.onConnectionState.add(listener)
      },
      remove: listener => {
        linked.delete(listener)
        current.onConnectionState.remove(listener)
      },
    },
  }

  const account = accountOver(life, live, place)
  const messenger = messengerOver(live, { within: answerWithin(life, ANSWER_MS), session: account })
  life.own(() => {
    messenger.close()
    void current.destroy()
  })
  return { account, messenger }
}
