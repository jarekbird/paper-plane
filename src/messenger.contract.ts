import { describe, expect, it } from 'vitest'
import { TroubleError, type Messenger, type Trouble } from './messenger.ts'

export interface ContractWorld {
  messenger: Messenger
  chat: string
  unreadChat: string
  channel: string
  saved(): Promise<string[]>
  sponsoredSeen(): Promise<number>
  trouble(next: Trouble | null): Promise<void>
  loseAnswer(): Promise<void>
}

const troubleIn = async (work: Promise<unknown>) => {
  try {
    await work
    return 'none'
  } catch (error) {
    return error instanceof TroubleError ? error.trouble : `not a TroubleError: ${String(error)}`
  }
}

export function messengerContract(name: string, make: () => Promise<ContractWorld>): void {
  describe(`A6: ${name} keeps the messenger contract`, () => {
    it('lists chats newest first, each with its newest message', async () => {
      const { messenger } = await make()
      const chats = await messenger.chats()
      const times = chats.flatMap(chat => (chat.last ? [chat.last.at] : []))
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

    it('takes back a message the user sent, for everyone, and tells listeners', async () => {
      const { messenger, chat } = await make()
      const before = (await messenger.history(chat, 1))[0]?.id
      const sent = await messenger.send(chat, 'Sent by mistake')
      let told = 0
      const stop = messenger.onChange(() => told++)
      await messenger.unsend(sent)
      expect((await messenger.history(chat, 1))[0]?.id).toBe(before)
      expect(told).toBeGreaterThan(0)
      stop()
    })

    it('keeps a reply as the chat’s draft, but never over a draft that is already waiting', async () => {
      const { messenger, chat } = await make()
      const live = new AbortController().signal
      expect(await messenger.keep(chat, 'See you at noon', live)).toBe(true)
      expect(await messenger.keep(chat, 'Something else', live)).toBe(false)
    })

    it('keeps only the first of two replies kept for one chat at the same moment', async () => {
      const { messenger, chat } = await make()
      const live = new AbortController().signal
      const kept = await Promise.all([messenger.keep(chat, 'First', live), messenger.keep(chat, 'Second', live)])
      expect(kept).toEqual([true, false])
    })

    it('A4: keeps nothing for a caller that has already gone', async () => {
      const { messenger, chat } = await make()
      const gone = new AbortController()
      gone.abort()
      await expect(messenger.keep(chat, 'Too late', gone.signal)).rejects.toThrow()
      expect(await messenger.keep(chat, 'In time', new AbortController().signal)).toBe(true)
    })

    it('copies a message to Saved Messages', async () => {
      const { messenger, unreadChat, saved } = await make()
      const newest = (await messenger.history(unreadChat, 3)).at(-1)!
      await messenger.save(newest)
      expect(await saved()).toEqual([newest.text])
    })

    it('likes a message, shows it as liked from then on, and tells listeners', async () => {
      const { messenger, unreadChat } = await make()
      const newest = (await messenger.history(unreadChat, 3)).at(-1)!
      expect(newest.liked).toBe(false)
      let told = 0
      const stop = messenger.onChange(() => told++)
      await messenger.like(newest)
      expect((await messenger.history(unreadChat, 3)).at(-1)).toMatchObject({ id: newest.id, liked: true })
      expect(told).toBeGreaterThan(0)
      stop()
    })

    it('G6: has a sponsored message for a channel, and none for a chat with a person', async () => {
      const { messenger, chat, channel } = await make()
      const sponsored = await messenger.sponsored(channel)
      expect(sponsored?.title).toBeTruthy()
      expect(sponsored?.text).toBeTruthy()
      expect(sponsored?.link).toBeTruthy()
      expect(await messenger.sponsored(chat)).toBeNull()
    })

    it('G6: is told once when a sponsored message was seen, and refuses one it never gave', async () => {
      const { messenger, channel, sponsoredSeen } = await make()
      const sponsored = await messenger.sponsored(channel)
      await messenger.sawSponsored(sponsored!)
      expect(await sponsoredSeen()).toBe(1)
      await expect(messenger.sawSponsored({ id: 'made-up', title: 'x', text: 'x', link: 'x.example' })).rejects.toThrow()
      expect(await sponsoredSeen()).toBe(1)
    })

    it('stops telling a listener that left', async () => {
      const { messenger, chat } = await make()
      let told = 0
      messenger.onChange(() => told++)()
      await messenger.send(chat, 'Nobody listens')
      expect(told).toBe(0)
    })

    it('fails every call, saying Telegram cannot be reached, while it cannot, and sends nothing', async () => {
      const { messenger, chat, trouble } = await make()
      const newest = (await messenger.history(chat, 1))[0]?.id
      await trouble({ kind: 'unreachable' })
      const calls = [
        () => messenger.chats(),
        () => messenger.history(chat, 1),
        () => messenger.send(chat, 'Into the void'),
        () => messenger.read(chat),
      ]
      for (const call of calls) expect(await troubleIn(call())).toEqual({ kind: 'unreachable' })
      await trouble(null)
      expect((await messenger.history(chat, 1))[0]?.id).toBe(newest)
    })

    it('says how long Telegram asks the user to wait, and sends nothing meanwhile', async () => {
      const { messenger, chat, trouble } = await make()
      const newest = (await messenger.history(chat, 1))[0]?.id
      await trouble({ kind: 'wait', seconds: 120 })
      expect(await troubleIn(messenger.send(chat, 'Too soon'))).toEqual({ kind: 'wait', seconds: 120 })
      await trouble(null)
      expect((await messenger.history(chat, 1))[0]?.id).toBe(newest)
    })

    it('tells listeners when Telegram cannot be reached any more, and when it can again', async () => {
      const { messenger, trouble } = await make()
      let told = 0
      const stop = messenger.onChange(() => told++)
      await trouble({ kind: 'unreachable' })
      expect(told).toBeGreaterThan(0)
      told = 0
      await trouble(null)
      expect(told).toBeGreaterThan(0)
      stop()
    })

    it('S5: delivers a message once when Telegram took it, its answer was lost, and the same attempt is made again', async () => {
      const { messenger, chat, loseAnswer } = await make()
      const attempt = {}
      await loseAnswer()
      await expect(messenger.send(chat, 'Only once', attempt)).rejects.toThrow()
      const sent = await messenger.send(chat, 'Only once', attempt)
      expect(sent).toMatchObject({ chat, text: 'Only once', mine: true })
      const arrived = (await messenger.history(chat, 10)).filter(message => message.text === 'Only once')
      expect(arrived.map(message => message.id)).toEqual([sent.id])
    })

    it('sends the same words again when they are a new attempt', async () => {
      const { messenger, chat } = await make()
      await messenger.send(chat, 'Twice on purpose', {})
      await messenger.send(chat, 'Twice on purpose', {})
      expect((await messenger.history(chat, 10)).filter(message => message.text === 'Twice on purpose')).toHaveLength(2)
    })
  })
}
