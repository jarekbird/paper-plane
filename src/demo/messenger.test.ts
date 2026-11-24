import { describe, expect, it } from 'vitest'
import { messengerContract } from '../messenger.contract.ts'
import { DEMO_PICKS, demoMessenger } from './messenger.ts'

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
})
