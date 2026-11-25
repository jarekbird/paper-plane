import type { Chat, Messenger } from '../messenger.ts'
import { LIKE, toChat, toMessage, type DialogLike, type MessageLike } from './map.ts'

export interface ClientLike {
  iterDialogs(params: { limit: number; archived: 'exclude' }): AsyncIterable<DialogLike>
  getHistory(chat: number, params: { limit: number }): Promise<MessageLike[]>
  sendText(chat: number, text: string): Promise<MessageLike>
  readHistory(chat: number): Promise<void>
  deleteMessagesById(chat: number, ids: number[], params: { revoke: boolean }): Promise<void>
  getPeerDialogs(chat: number): Promise<(DialogLike | null)[]>
  saveDraft(chat: number, draft: { message: string }): Promise<void>
  forwardMessagesById(params: { toChatId: 'me'; fromChatId: number; messages: number[] }): Promise<unknown>
  sendReaction(params: { chatId: number; message: number; emoji: string }): Promise<unknown>
  onUpdate: {
    add(listener: (update: { name: string }) => void): void
    remove(listener: (update: { name: string }) => void): void
  }
}

const DIALOGS = 100
const CHANGES = new Set(['new_message', 'edit_message', 'delete_message', 'history_read'])

export function messengerOver(client: ClientLike): Messenger & { close(): void } {
  const listeners = new Set<() => void>()
  const keeping = new Map<string, Promise<boolean>>()
  const changed = () => {
    for (const listener of [...listeners]) listener()
  }
  const heard = (update: { name: string }) => {
    if (CHANGES.has(update.name)) changed()
  }
  client.onUpdate.add(heard)

  return {
    close: () => client.onUpdate.remove(heard),
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
    send: async (chat, text) => {
      const sent = toMessage(await client.sendText(Number(chat), text))
      changed()
      return sent
    },
    read: async chat => {
      await client.readHistory(Number(chat))
      changed()
    },
    unsend: async message => {
      await client.deleteMessagesById(Number(message.chat), [Number(message.id)], { revoke: true })
      changed()
    },
    keep: (chat, text, signal) => {
      const turn = (keeping.get(chat) ?? Promise.resolve(false))
        .catch(() => false)
        .then(async () => {
          signal.throwIfAborted()
          const [dialog] = await client.getPeerDialogs(Number(chat))
          signal.throwIfAborted()
          if (dialog?.draftMessage?.text) return false
          await client.saveDraft(Number(chat), { message: text })
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
      await client.forwardMessagesById({ toChatId: 'me', fromChatId: Number(message.chat), messages: [Number(message.id)] })
    },
    like: async message => {
      await client.sendReaction({ chatId: Number(message.chat), message: Number(message.id), emoji: LIKE })
      changed()
    },
    onChange: told => {
      listeners.add(told)
      return () => void listeners.delete(told)
    },
  }
}
