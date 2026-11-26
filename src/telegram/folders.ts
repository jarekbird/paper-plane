import { Dialog, type tl } from '@mtcute/core'
import { getMarkedPeerId } from '@mtcute/core/utils.js'
import type { FolderLike } from './map.ts'

export const foldersOf = (filters: readonly tl.TypeDialogFilter[]): FolderLike<Dialog>[] =>
  filters.flatMap(filter => {
    if (filter._ === 'dialogFilterDefault') return []
    const pinned = new Set(filter.pinnedPeers.map(peer => getMarkedPeerId(peer)))
    const others = Dialog.filterFolder(filter)
    return [{ id: filter.id, title: filter.title.text, has: dialog => pinned.has(dialog.peer.id) || Boolean(others(dialog)) }]
  })
