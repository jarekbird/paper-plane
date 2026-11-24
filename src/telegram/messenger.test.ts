import { describe, expect, it } from 'vitest'
import { messengerContract } from '../messenger.contract.ts'
import type { DialogLike, MessageLike, PeerLike } from './map.ts'
import { messengerOver, type ClientLike } from './messenger.ts'

function fakeClient() {
  let serial = 0
  let clock = 1_700_000_000_000
  const me: PeerLike = { type: 'user', id: 1, displayName: 'Me' }
  const peers: PeerLike[] = [
    { type: 'user', id: 42, displayName: 'Anna Lee' },
    { type: 'chat', id: -1001234, displayName: 'Launch crew', chatType: 'supergroup' },
  ]
  const unread = new Map<number, number>([[-1001234, 2]])
  const messages: MessageLike[] = []
  const drafts = new Map<number, string>()
  const forwarded: string[] = []
  const listeners = new Set<(update: { name: string }) => void>()
  const add = (chat: PeerLike, sender: PeerLike, text: string, isService = false): MessageLike => {
    const message: MessageLike = {
      id: ++serial,
      text,
      date: new Date((clock += 60_000)),
      isOutgoing: sender === me,
      isService,
      chat,
      sender,
      media: null,
      reactions: null,
    }
    messages.push(message)
    return message
  }
  const peer = (id: number) => peers.find(candidate => candidate.id === id)!
  const of = (id: number) => messages.filter(message => message.chat.id === id)
  add(peers[0], peers[0], 'Hello')
  add(peers[1], peers[1], 'Build is green.')
  add(peers[1], peers[1], 'Cy joined', true)

  const client: ClientLike = {
    iterDialogs: async function* () {
      const dialogs: DialogLike[] = peers.map(entry => ({
        peer: entry,
        unreadCount: unread.get(entry.id) ?? 0,
        lastMessage: of(entry.id).at(-1) ?? null,
        draftMessage: drafts.has(entry.id) ? { text: drafts.get(entry.id)! } : null,
      }))
      yield* dialogs.sort((a, b) => (b.lastMessage?.date.getTime() ?? 0) - (a.lastMessage?.date.getTime() ?? 0))
    },
    getHistory: async (chat, { limit }) => of(chat).reverse().slice(0, limit),
    sendText: async (chat, text) => add(peer(chat), me, text),
    readHistory: async chat => void unread.set(chat, 0),
    deleteMessagesById: async (chat, ids) => {
      for (const id of ids) {
        const at = messages.findIndex(message => message.chat.id === chat && message.id === id)
        if (at >= 0) messages.splice(at, 1)
      }
    },
    getPeerDialogs: async chat => [
      { peer: peer(chat), unreadCount: 0, lastMessage: null, draftMessage: drafts.has(chat) ? { text: drafts.get(chat)! } : null },
    ],
    saveDraft: async (chat, draft) => void drafts.set(chat, draft.message),
    forwardMessagesById: async ({ fromChatId, messages: ids }) => {
      for (const message of of(fromChatId)) if (ids.includes(message.id)) forwarded.push(message.text)
    },
    sendReaction: async ({ chatId, message: id, emoji }) => {
      const at = messages.findIndex(message => message.chat.id === chatId && message.id === id)
      messages[at] = { ...messages[at], reactions: { reactions: [{ emoji, order: 0 }] } }
    },
    onUpdate: { add: listener => void listeners.add(listener), remove: listener => void listeners.delete(listener) },
  }
  return {
    client,
    peers,
    add,
    forwarded,
    listening: () => listeners.size,
    emit: (name: string) => listeners.forEach(listener => listener({ name })),
  }
}

messengerContract('the Telegram adapter, over a client that tells nothing about the user’s own writes', async () => {
  const fake = fakeClient()
  return { messenger: messengerOver(fake.client), chat: '42', unreadChat: '-1001234', saved: async () => fake.forwarded }
})

describe('the Telegram adapter', () => {
  it('tells listeners when Telegram reports a message, an edit, a deletion or a read, and nothing else', () => {
    const fake = fakeClient()
    let told = 0
    messengerOver(fake.client).onChange(() => told++)
    for (const name of ['new_message', 'edit_message', 'delete_message', 'history_read', 'user_typing', 'user_status']) fake.emit(name)
    expect(told).toBe(4)
  })

  it('leaves a service notice such as "Cy joined" out of a chat’s history', async () => {
    const history = await messengerOver(fakeClient().client).history('-1001234', 10)
    expect(history.map(message => message.text)).toEqual(['Build is green.'])
  })

  it('stops listening to the client when it is closed', () => {
    const fake = fakeClient()
    messengerOver(fake.client).close()
    expect(fake.listening()).toBe(0)
  })
})
