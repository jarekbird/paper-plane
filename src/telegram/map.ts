import type { Chat, ChatKind, Folder, Message } from '../messenger.ts'

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
  unreadMentionsCount: number
  isArchived: boolean
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

export interface SponsoredLike {
  randomId: Uint8Array
  title: string
  message: string
  url: string
}

export const sponsoredId = (ad: SponsoredLike): string => Array.from(ad.randomId, byte => byte.toString(16).padStart(2, '0')).join('')

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

const FOLDER_CHANGES = new Set([
  'updateDialogFilter',
  'updateDialogFilterOrder',
  'updateDialogFilters',
  'updateFolderPeers',
  'updateNotifySettings',
  'updateDialogUnreadMark',
  'updateReadMessagesContents',
  'updateChannelReadMessagesContents',
])

export const foldersChanged = (told: { update: { _: string } }): boolean => FOLDER_CHANGES.has(told.update._)

export interface FolderLike<D> {
  id: number
  title: string
  has(dialog: D): boolean
}

export function toChat<D extends DialogLike>(dialog: D, folders: readonly FolderLike<D>[] = []): Chat {
  const last = dialog.lastMessage
  const within: Folder[] = folders.filter(folder => folder.has(dialog)).map(folder => ({ id: String(folder.id), title: folder.title }))
  return {
    id: chatId(dialog.peer),
    title: dialog.peer.displayName,
    kind: kindOf(dialog.peer),
    folders: within,
    unread: dialog.unreadCount,
    mentions: dialog.unreadMentionsCount,
    last: last && !last.isService ? toMessage(last) : null,
  }
}
