import { TroubleError, type Chat, type Messenger } from '../messenger.ts'
import { sentBefore, signedOut, troubleOf, type Within } from './trouble.ts'
import { LIKE, sponsoredId, toChat, toMessage, type DialogLike, type FolderLike, type MessageLike, type SponsoredLike } from './map.ts'

export interface ClientLike<Id, D extends DialogLike = DialogLike> {
  folders(): Promise<FolderLike<D>[]>
  iterDialogs(params: { limit: number; archived: 'exclude' }): AsyncIterable<D>
  getHistory(chat: number, params: { limit: number }): Promise<MessageLike[]>
  randomId(): Id
  sendText(chat: number, text: string, params: { abortSignal: AbortSignal; randomId: Id }): Promise<MessageLike>
  readHistory(chat: number, params: { clearMentions: true }): Promise<void>
  deleteMessagesById(chat: number, ids: number[], params: { revoke: boolean }): Promise<void>
  getPeerDialogs(chat: number): Promise<(DialogLike | null)[]>
  saveDraft(chat: number, draft: { message: string }): Promise<void>
  forwardMessagesById(params: { toChatId: 'me'; fromChatId: number; messages: number[] }): Promise<unknown>
  sendReaction(params: { chatId: number; message: number; emoji: string }): Promise<unknown>
  sponsoredMessages(chat: number, signal: AbortSignal): Promise<SponsoredLike[]>
  viewSponsored(randomId: Uint8Array): Promise<unknown>
  onUpdate: {
    add(listener: (update: { name: string }) => void): void
    remove(listener: (update: { name: string }) => void): void
  }
  onConnectionState: {
    add(listener: (state: LinkState) => void): void
    remove(listener: (state: LinkState) => void): void
  }
}

export type LinkState = 'offline' | 'connecting' | 'updating' | 'connected'

export interface SignedIn {
  era(): number
  ended(era: number): void
}

export interface Asking {
  within: Within
  session: SignedIn
  now?: () => number
}

const DIALOGS = 100
const CHANGES = new Set(['new_message', 'edit_message', 'delete_message', 'history_read'])
export const GRACE_MS = 3_000

export function messengerOver<Id, D extends DialogLike = DialogLike>(
  client: ClientLike<Id, D>,
  { within, session, now = Date.now }: Asking,
): Messenger & { close(): void } {
  const listeners = new Set<() => void>()
  const keeping = new Map<string, Promise<boolean>>()
  const ads = new Map<string, Uint8Array>()
  const tried = new WeakMap<object, Id>()
  let downSince: number | null = null
  let unanswered = false
  const changed = () => {
    for (const listener of [...listeners]) listener()
  }
  const heard = (update: { name: string }) => {
    if (CHANGES.has(update.name)) changed()
  }
  const linked = (state: LinkState) => {
    const up = state === 'connected' || state === 'updating'
    if (up === (downSince === null)) return
    downSince = up ? null : now()
    changed()
  }
  client.onUpdate.add(heard)
  client.onConnectionState.add(linked)

  const ask = async <T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    const era = session.era()
    let answer: T
    try {
      if (downSince !== null && now() - downSince >= GRACE_MS) throw new TroubleError({ kind: 'unreachable' })
      answer = await within(work)
    } catch (error) {
      if (signedOut(error)) session.ended(era)
      const trouble = troubleOf(error)
      if (trouble?.kind === 'unreachable') unanswered = true
      throw trouble ? new TroubleError(trouble) : error
    }
    if (unanswered) {
      unanswered = false
      changed()
    }
    return answer
  }

  return {
    close: () => {
      client.onUpdate.remove(heard)
      client.onConnectionState.remove(linked)
    },
    chats: () =>
      ask(async signal => {
        const folders = await client.folders()
        signal.throwIfAborted()
        const chats: Chat[] = []
        for await (const dialog of client.iterDialogs({ limit: DIALOGS, archived: 'exclude' })) {
          signal.throwIfAborted()
          chats.push(toChat(dialog, folders))
        }
        return chats
      }),
    history: async (chat, limit) => {
      const newestFirst = await ask(() => client.getHistory(Number(chat), { limit }))
      return newestFirst
        .filter(message => !message.isService)
        .map(toMessage)
        .reverse()
    },
    send: async (chat, text, attempt) => {
      const kept = attempt ? tried.get(attempt) : undefined
      const randomId = kept ?? client.randomId()
      if (attempt) tried.set(attempt, randomId)
      let sent: MessageLike
      try {
        sent = await ask(abortSignal => client.sendText(Number(chat), text, { abortSignal, randomId }))
      } catch (error) {
        if (kept === undefined || !sentBefore(error)) throw error
        changed()
        return null
      }
      if (attempt) tried.delete(attempt)
      changed()
      return toMessage(sent)
    },
    read: async chat => {
      await ask(() => client.readHistory(Number(chat), { clearMentions: true }))
      changed()
    },
    unsend: async message => {
      await ask(() => client.deleteMessagesById(Number(message.chat), [Number(message.id)], { revoke: true }))
      changed()
    },
    keep: (chat, text, signal) => {
      const turn = (keeping.get(chat) ?? Promise.resolve(false))
        .catch(() => false)
        .then(async () => {
          signal.throwIfAborted()
          const [dialog] = await ask(() => client.getPeerDialogs(Number(chat)))
          signal.throwIfAborted()
          if (dialog?.draftMessage?.text) return false
          await ask(() => client.saveDraft(Number(chat), { message: text }))
          return true
        })
      keeping.set(chat, turn)
      const done = () => {
        if (keeping.get(chat) === turn) keeping.delete(chat)
      }
      turn.then(done, done)
      return turn
    },
    save: async message => {
      await ask(() => client.forwardMessagesById({ toChatId: 'me', fromChatId: Number(message.chat), messages: [Number(message.id)] }))
    },
    like: async message => {
      await ask(() => client.sendReaction({ chatId: Number(message.chat), message: Number(message.id), emoji: LIKE }))
      changed()
    },
    sponsored: async chat => {
      const [first] = await ask(signal => client.sponsoredMessages(Number(chat), signal))
      if (!first) return null
      const id = sponsoredId(first)
      ads.set(id, first.randomId)
      return { id, title: first.title, text: first.message, link: first.url }
    },
    sawSponsored: async sponsored => {
      const randomId = ads.get(sponsored.id)
      if (!randomId) throw new Error('No such sponsored message')
      await ask(() => client.viewSponsored(randomId))
    },
    onChange: told => {
      listeners.add(told)
      return () => void listeners.delete(told)
    },
  }
}
