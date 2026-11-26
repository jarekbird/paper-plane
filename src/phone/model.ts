import { folderPick, type Inbox } from '../inbox.ts'
import type { ChatKind } from '../messenger.ts'

export interface PickRow {
  id: string
  title: string
  kind: string
  picked: boolean
  through: string | null
}

export interface FolderRow {
  pick: string
  title: string
  chats: string
  picked: boolean
}

const KINDS: Record<ChatKind, string> = { person: 'Person', group: 'Group', channel: 'Channel' }

export function pickRows(inbox: Inbox): PickRow[] {
  const picks = inbox.picks()
  return inbox.all().map(chat => {
    const through = chat.folders.find(folder => picks.includes(folderPick(folder.id)))?.title ?? null
    return { id: chat.id, title: chat.title, kind: KINDS[chat.kind], picked: through !== null || picks.includes(chat.id), through }
  })
}

export function folderRows(inbox: Inbox): FolderRow[] {
  const picks = inbox.picks()
  return inbox.folders().map(({ folder, chats }) => ({
    pick: folderPick(folder.id),
    title: folder.title,
    chats: chats === 1 ? '1 chat' : `${chats} chats`,
    picked: picks.includes(folderPick(folder.id)),
  }))
}

export function setPicked(inbox: Inbox, id: string, picked: boolean): Promise<void> {
  const others = inbox.picks().filter(pick => pick !== id)
  return inbox.pick(picked ? [...others, id] : others)
}
