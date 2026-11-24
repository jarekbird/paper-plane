import type { Chat, Messenger } from '../messenger.ts'
import { toChat, toMessage, type DialogLike, type MessageLike } from './map.ts'

export interface ClientLike {
  iterDialogs(params: { limit: number; archived: 'exclude' }): AsyncIterable<DialogLike>
  getHistory(chat: number, params: { limit: number }): Promise<MessageLike[]>
  sendText(chat: number, text: string): Promise<MessageLike>
  readHistory(chat: number): Promise<void>
  deleteMessagesById(chat: number, ids: number[], params: { revoke: boolean }): Promise<void>
  onUpdate: {
    add(listener: (update: { name: string }) => void): void
    remove(listener: (update: { name: string }) => void): void
  }
}

const DIALOGS = 100
const CHANGES = new Set(['new_message', 'edit_message', 'delete_message', 'history_read'])

export function messengerOver(client: ClientLike): Messenger & { close(): void } {
  const listeners = new Set<() => void>()
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
    onChange: told => {
      listeners.add(told)
      return () => void listeners.delete(told)
    },
  }
}
