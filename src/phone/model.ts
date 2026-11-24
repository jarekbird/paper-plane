import type { Inbox } from '../inbox.ts'
import type { ChatKind } from '../messenger.ts'

export interface PickRow {
  id: string
  title: string
  kind: string
  picked: boolean
}

const KINDS: Record<ChatKind, string> = { person: 'Person', group: 'Group', channel: 'Channel' }

export function pickRows(inbox: Inbox): PickRow[] {
  const picks = inbox.picks()
  return inbox.all().map(chat => ({ id: chat.id, title: chat.title, kind: KINDS[chat.kind], picked: picks.includes(chat.id) }))
}

export function setPicked(inbox: Inbox, id: string, picked: boolean): Promise<void> {
  const others = inbox.picks().filter(pick => pick !== id)
  return inbox.pick(picked ? [...others, id] : others)
}
