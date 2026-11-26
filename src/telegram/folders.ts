import { Dialog, type tl } from '@mtcute/core'
import { getMarkedPeerId } from '@mtcute/core/utils.js'
import type { FolderLike } from './map.ts'

// mtcute 0.32.8 calls a chat unread only from two unread messages on (Dialog.isUnread); its folder rule reads that.
const asTelegramCounts = (dialog: Dialog): Dialog =>
  ({
    peer: dialog.peer,
    isUnread: dialog.unreadCount > 0 || dialog.unreadMentionsCount > 0 || dialog.isManuallyUnread,
    isMuted: dialog.isMuted,
    isArchived: dialog.isArchived,
  }) as Dialog

export const foldersOf = (filters: readonly tl.TypeDialogFilter[]): FolderLike<Dialog>[] =>
  filters.flatMap(filter => {
    if (filter._ === 'dialogFilterDefault') return []
    const pinned = new Set(filter.pinnedPeers.map(peer => getMarkedPeerId(peer)))
    const others = Dialog.filterFolder(filter)
    return [
      { id: filter.id, title: filter.title.text, has: dialog => pinned.has(dialog.peer.id) || Boolean(others(asTelegramCounts(dialog))) },
    ]
  })
