import { describe, expect, it } from 'vitest'
import { messengerContract } from '../messenger.contract.ts'
import { DEMO_PICKS, demoDrafter, demoMessenger } from './messenger.ts'

messengerContract('the sample account', async () => ({
  messenger: demoMessenger(() => 1_700_000_000_000),
  chat: 'sam',
  unreadChat: 'anna',
}))

describe('the sample account', () => {
  it('starts with picks that exist, so a first launch shows chats', async () => {
    const ids = (await demoMessenger().chats()).map(chat => chat.id)
    expect(DEMO_PICKS.every(pick => ids.includes(pick))).toBe(true)
  })

  it('counts a message that arrives as new', async () => {
    const messenger = demoMessenger()
    messenger.arrive('sam', 'Sam', 'Hello')
    expect((await messenger.chats()).find(chat => chat.id === 'sam')?.unread).toBe(1)
  })

  it('drafts an answer to the newest message that is not the user’s own', async () => {
    const messenger = demoMessenger()
    const [anna] = (await messenger.chats()).filter(chat => chat.id === 'anna')
    messenger.arrive('anna', 'Anna', 'Does one work?')
    expect(await demoDrafter(anna, await messenger.history('anna', 6), new AbortController().signal)).toBe('Yes, that works for me.')
  })
})
