import { describe, expect, it } from 'vitest'
import { toChat, toMessage, type MessageLike, type PeerLike } from './map.ts'

const anna: PeerLike = { type: 'user', id: 42, displayName: 'Anna Lee' }
const crew: PeerLike = { type: 'chat', id: -1001234, displayName: 'Launch crew', chatType: 'supergroup' }
const news: PeerLike = { type: 'chat', id: -1005678, displayName: 'Glasses news', chatType: 'channel' }

const message = (over: Partial<MessageLike> = {}): MessageLike => ({
  id: 7,
  text: 'See you at noon',
  date: new Date(1_700_000_000_000),
  isOutgoing: false,
  isService: false,
  chat: anna,
  sender: anna,
  media: null,
  reactions: null,
  ...over,
})

describe('what Telegram says, as the app reads it', () => {
  it('keeps who wrote a message, where and when, and whether it is the user’s own', () => {
    expect(toMessage(message({ isOutgoing: true }))).toEqual({
      id: '7',
      chat: '42',
      from: 'Anna Lee',
      text: 'See you at noon',
      at: 1_700_000_000_000,
      mine: true,
      liked: false,
    })
  })

  it('shows a message as liked only when the thumbs-up is the user’s own', () => {
    const others = { reactions: [{ emoji: '👍', order: null }] }
    const own = {
      reactions: [
        { emoji: '❤', order: 0 },
        { emoji: '👍', order: 1 },
      ],
    }
    const ownHeart = { reactions: [{ emoji: '❤', order: 0 }] }
    const liked = [others, own, ownHeart].map(reactions => toMessage(message({ reactions })).liked)
    expect(liked).toEqual([false, true, false])
  })

  it('names an attachment in words, since the glasses show text only', () => {
    expect(toMessage(message({ text: '', media: { type: 'photo' } })).text).toBe('[Photo]')
    expect(toMessage(message({ text: 'the venue', media: { type: 'photo' } })).text).toBe('[Photo] the venue')
    expect(toMessage(message({ text: '', media: { type: 'something_new' } })).text).toBe('[Attachment]')
  })

  it('tells a person from a group from a channel, which decides how a message is headed', () => {
    const dialog = (peer: PeerLike) => toChat({ peer, unreadCount: 0, lastMessage: null, draftMessage: null }).kind
    expect([dialog(anna), dialog(crew), dialog(news)]).toEqual(['person', 'group', 'channel'])
  })

  it('gives a group and a person different ids even when their numbers match', () => {
    const group: PeerLike = { type: 'chat', id: -42, displayName: 'Forty-two', chatType: 'group' }
    expect(toChat({ peer: group, unreadCount: 0, lastMessage: null, draftMessage: null }).id).not.toBe(
      toChat({ peer: anna, unreadCount: 0, lastMessage: null, draftMessage: null }).id,
    )
  })

  it('carries the unread count and the newest message, but not a service notice such as "Anna joined"', () => {
    expect(toChat({ peer: crew, unreadCount: 3, lastMessage: message({ chat: crew }), draftMessage: null })).toMatchObject({
      unread: 3,
      last: { text: 'See you at noon' },
    })
    expect(
      toChat({ peer: crew, unreadCount: 0, lastMessage: message({ chat: crew, isService: true }), draftMessage: null }).last,
    ).toBeNull()
  })
})
