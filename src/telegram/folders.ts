import type { Dialog, tl } from '@mtcute/core'
import { getMarkedPeerId } from '@mtcute/core/utils.js'
import type { FolderLike } from './map.ts'

export interface MutedByDefault {
  people: boolean
  groups: boolean
  channels: boolean
}

export const NONE_MUTED: MutedByDefault = { people: false, groups: false, channels: false }

export const asksWhoIsMuted = (filters: readonly tl.TypeDialogFilter[]): boolean =>
  filters.some(filter => filter._ === 'dialogFilter' && filter.excludeMuted === true)

export const mutedBy = (settings: { silent?: boolean; muteUntil?: number }, now: number): boolean =>
  settings.muteUntil !== undefined ? settings.muteUntil > now / 1000 : (settings.silent ?? false)

const ids = (peers: readonly tl.TypeInputPeer[]) => new Set(peers.map(peer => getMarkedPeerId(peer)))

// The rule Telegram's own apps use for a folder (TDLib, DialogFilter::need_dialog). mtcute 0.32.8's Dialog.filterFolder differs: it leaves out pinned chats, counts a chat as unread only from two messages, and takes bots for non-contacts.
function holds(filter: tl.RawDialogFilter | tl.RawDialogFilterChatlist, defaults: MutedByDefault): (dialog: Dialog) => boolean {
  const listed = new Set([...ids(filter.pinnedPeers), ...ids(filter.includePeers)])
  if (filter._ === 'dialogFilterChatlist') return dialog => listed.has(dialog.peer.id)
  const left = ids(filter.excludePeers)
  return dialog => {
    const peer = dialog.peer
    if (listed.has(peer.id)) return true
    if (left.has(peer.id)) return false
    const channel = peer.type === 'chat' && peer.chatType === 'channel'
    if (dialog.unreadMentionsCount === 0) {
      const muted = dialog.isMuted ?? (peer.type === 'user' ? defaults.people : channel ? defaults.channels : defaults.groups)
      if (filter.excludeMuted && muted) return false
      if (filter.excludeRead && dialog.unreadCount === 0 && !dialog.isManuallyUnread) return false
    }
    if (filter.excludeArchived && dialog.isArchived) return false
    if (peer.type !== 'user') return (channel ? filter.broadcasts : filter.groups) === true
    if (peer.isBot) return filter.bots === true
    return (peer.isSelf || peer.isContact ? filter.contacts : filter.nonContacts) === true
  }
}

export const foldersOf = (filters: readonly tl.TypeDialogFilter[], defaults: MutedByDefault = NONE_MUTED): FolderLike<Dialog>[] =>
  filters.flatMap(filter =>
    filter._ === 'dialogFilterDefault' ? [] : [{ id: filter.id, title: filter.title.text, has: holds(filter, defaults) }],
  )
