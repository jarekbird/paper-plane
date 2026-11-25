import type { Chat, ChatKind, Message } from '../messenger.ts'

export interface PeerLike {
  type: 'user' | 'chat'
  id: number
  displayName: string
  chatType?: string
}

export interface MessageLike {
  id: number
  text: string
  date: Date
  isOutgoing: boolean
  isService: boolean
  chat: PeerLike
  sender: { displayName: string }
  media: { type: string } | null
  reactions: { reactions: readonly { emoji: unknown; order: number | null }[] } | null
}

export interface DialogLike {
  peer: PeerLike
  unreadCount: number
  lastMessage: MessageLike | null
  draftMessage: { text: string } | null
}

export const LIKE = '👍'

const MEDIA: Record<string, string> = {
  photo: 'Photo',
  video: 'Video',
  voice: 'Voice message',
  audio: 'Audio',
  sticker: 'Sticker',
  document: 'File',
  location: 'Location',
  live_location: 'Location',
  contact: 'Contact',
  poll: 'Poll',
}

export const chatId = (peer: PeerLike): string => String(peer.id)

export const kindOf = (peer: PeerLike): ChatKind => (peer.type === 'user' ? 'person' : peer.chatType === 'channel' ? 'channel' : 'group')

export function toMessage(message: MessageLike): Message {
  const media = message.media ? `[${MEDIA[message.media.type] ?? 'Attachment'}]` : ''
  return {
    id: String(message.id),
    chat: chatId(message.chat),
    from: message.sender.displayName,
    text: [media, message.text].filter(Boolean).join(' '),
    at: message.date.getTime(),
    mine: message.isOutgoing,
    liked: message.reactions?.reactions.some(reaction => reaction.emoji === LIKE && reaction.order !== null) ?? false,
  }
}

export function toChat(dialog: DialogLike): Chat {
  const last = dialog.lastMessage
  return {
    id: chatId(dialog.peer),
    title: dialog.peer.displayName,
    kind: kindOf(dialog.peer),
    unread: dialog.unreadCount,
    last: last && !last.isService ? toMessage(last) : null,
  }
}
