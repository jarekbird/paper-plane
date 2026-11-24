import { describe, expect, it } from 'vitest'
import type { Messenger } from './messenger.ts'

export interface ContractWorld {
  messenger: Messenger
  chat: string
  unreadChat: string
}

export function messengerContract(name: string, make: () => Promise<ContractWorld>): void {
  describe(`A6: ${name} keeps the messenger contract`, () => {
    it('lists chats newest first, each with its newest message', async () => {
      const { messenger } = await make()
      const chats = await messenger.chats()
      const times = chats.map(chat => chat.last?.at ?? 0)
      expect(chats.length).toBeGreaterThan(0)
      expect(times).toEqual([...times].sort((a, b) => b - a))
      for (const chat of chats) if (chat.last) expect(chat.last.chat).toBe(chat.id)
    })

    it('gives a chat’s history oldest first and no longer than asked', async () => {
      const { messenger, chat } = await make()
      const history = await messenger.history(chat, 2)
      expect(history.length).toBeLessThanOrEqual(2)
      expect(history.map(message => message.at)).toEqual([...history.map(message => message.at)].sort((a, b) => a - b))
      expect((await messenger.chats()).find(candidate => candidate.id === chat)?.last?.id).toBe(history.at(-1)?.id)
    })

    it('sends a message as the user, into that chat, and tells listeners', async () => {
      const { messenger, chat } = await make()
      let told = 0
      const stop = messenger.onChange(() => told++)
      const sent = await messenger.send(chat, 'Contract check')
      expect(sent).toMatchObject({ chat, text: 'Contract check', mine: true })
      expect((await messenger.history(chat, 1))[0]).toMatchObject({ id: sent.id, text: 'Contract check' })
      expect(told).toBeGreaterThan(0)
      stop()
    })

    it('marks a chat read, so its count of new messages is gone', async () => {
      const { messenger, unreadChat } = await make()
      const unread = async () => (await messenger.chats()).find(chat => chat.id === unreadChat)?.unread
      expect(await unread()).toBeGreaterThan(0)
      await messenger.read(unreadChat)
      expect(await unread()).toBe(0)
    })

    it('stops telling a listener that left', async () => {
      const { messenger, chat } = await make()
      let told = 0
      messenger.onChange(() => told++)()
      await messenger.send(chat, 'Nobody listens')
      expect(told).toBe(0)
    })
  })
}
