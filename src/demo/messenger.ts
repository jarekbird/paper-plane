import {
  TroubleError,
  type Chat,
  type ChatKind,
  type Folder,
  type Message,
  type Messenger,
  type Sponsored,
  type Trouble,
} from '../messenger.ts'

interface DemoChat {
  id: string
  title: string
  kind: ChatKind
  unread: number
  mentions: number
  folders: Folder[]
  messages: Message[]
}

const MINUTE = 60_000

const FRIENDS: Folder = { id: 'friends', title: 'Friends' }
const WORK: Folder = { id: 'work', title: 'Work' }
const SCRIPT: {
  id: string
  title: string
  kind: ChatKind
  unread: number
  mentions?: number
  folders: Folder[]
  lines: [from: string, text: string][]
}[] = [
  {
    id: 'anna',
    title: 'Anna',
    kind: 'person',
    unread: 2,
    folders: [FRIENDS],
    lines: [
      ['You', 'Running the demo at four.'],
      ['Anna', 'Nice. Are we still on for lunch first?'],
      ['Anna', 'I can do 12:30 at the usual place.'],
    ],
  },
  {
    id: 'launch',
    title: 'Launch crew',
    kind: 'group',
    unread: 1,
    mentions: 1,
    folders: [WORK],
    lines: [
      ['Ben', 'Build is green.'],
      ['You', 'Shipping after the review.'],
      ['Cy', '@you Can you confirm the demo time for Thursday?'],
    ],
  },
  {
    id: 'news',
    title: 'Glasses news',
    kind: 'channel',
    unread: 0,
    folders: [WORK],
    lines: [['Glasses news', 'Heads Up build week has started.']],
  },
  {
    id: 'sam',
    title: 'Sam',
    kind: 'person',
    unread: 0,
    folders: [FRIENDS],
    lines: [['Sam', 'Thanks for yesterday.']],
  },
]

export const DEMO_PICKS: readonly string[] = ['anna', 'launch', 'news']
export const DEMO_SPONSORED: Sponsored = {
  id: 'sample-ad',
  title: 'Sample sponsor',
  text: 'This is where Telegram shows a sponsored message in a channel.',
  link: 'example.org/sample',
}

export interface DemoMessenger extends Messenger {
  arrive(chat: string, from: string, text: string, mentions?: boolean): Message
  edit(message: Message, text: string): void
  sent(): readonly Message[]
  saved(): readonly Message[]
  seenSponsored(): readonly string[]
  drafts(): ReadonlyMap<string, string>
  trouble(next: Trouble | null): void
  loseAnswer(): void
  file(chat: string, folders: readonly Folder[]): void
}

export function demoMessenger(now: () => number = Date.now): DemoMessenger {
  let serial = 0
  const listeners = new Set<() => void>()
  const outbox: Message[] = []
  const kept: Message[] = []
  const seenAds: string[] = []
  const drafts = new Map<string, string>()
  const unanswered = new WeakSet<object>()
  let trouble: Trouble | null = null
  let losing = false
  const message = (chat: string, from: string, text: string, at: number): Message => ({
    id: `m${++serial}`,
    chat,
    from,
    text,
    at,
    mine: from === 'You',
    liked: false,
  })
  const started = now()
  const chats: DemoChat[] = SCRIPT.map(entry => ({
    id: entry.id,
    title: entry.title,
    kind: entry.kind,
    unread: entry.unread,
    mentions: entry.mentions ?? 0,
    folders: entry.folders,
    messages: entry.lines.map(([from, text], index) => message(entry.id, from, text, started - (entry.lines.length - index) * MINUTE)),
  }))
  const reach = () => {
    if (trouble) throw new TroubleError(trouble)
  }
  const find = (id: string): DemoChat => {
    const chat = chats.find(candidate => candidate.id === id)
    if (!chat) throw new Error('No such chat')
    return chat
  }
  const tell = () => {
    for (const listener of [...listeners]) listener()
  }
  const newestFirst = (a: DemoChat, b: DemoChat) => (b.messages.at(-1)?.at ?? 0) - (a.messages.at(-1)?.at ?? 0)

  return {
    chats: async (): Promise<Chat[]> => {
      reach()
      return [...chats].sort(newestFirst).map(chat => ({
        id: chat.id,
        title: chat.title,
        kind: chat.kind,
        unread: chat.unread,
        mentions: chat.mentions,
        folders: chat.folders,
        last: chat.messages.at(-1) ?? null,
      }))
    },
    history: async (id, limit) => {
      reach()
      return find(id).messages.slice(-limit)
    },
    send: async (id, text, attempt) => {
      reach()
      if (attempt && unanswered.has(attempt)) {
        tell()
        return null
      }
      const chat = find(id)
      const sent = message(id, 'You', text, now())
      chat.messages.push(sent)
      outbox.push(sent)
      tell()
      if (!losing) return sent
      losing = false
      if (attempt) unanswered.add(attempt)
      throw new TroubleError({ kind: 'unreachable' })
    },
    read: async id => {
      reach()
      const chat = find(id)
      if (chat.unread === 0 && chat.mentions === 0) return
      chat.unread = 0
      chat.mentions = 0
      tell()
    },
    unsend: async sent => {
      reach()
      const chat = find(sent.chat)
      const at = chat.messages.findIndex(message => message.id === sent.id && message.mine)
      if (at < 0) throw new Error('No such message')
      chat.messages.splice(at, 1)
      tell()
    },
    keep: async (id, text, signal) => {
      signal.throwIfAborted()
      reach()
      find(id)
      if (drafts.has(id)) return false
      drafts.set(id, text)
      return true
    },
    save: async message => {
      reach()
      const found = find(message.chat).messages.find(candidate => candidate.id === message.id)
      if (!found) throw new Error('No such message')
      kept.push(found)
    },
    like: async message => {
      reach()
      const chat = find(message.chat)
      const at = chat.messages.findIndex(candidate => candidate.id === message.id)
      if (at < 0) throw new Error('No such message')
      chat.messages[at] = { ...chat.messages[at], liked: true }
      tell()
    },
    sponsored: async id => {
      reach()
      return find(id).kind === 'channel' ? DEMO_SPONSORED : null
    },
    sawSponsored: async sponsored => {
      reach()
      if (sponsored.id !== DEMO_SPONSORED.id) throw new Error('No such sponsored message')
      seenAds.push(sponsored.id)
    },
    seenSponsored: () => seenAds,
    onChange: told => {
      listeners.add(told)
      return () => void listeners.delete(told)
    },
    arrive: (id, from, text, mentions = false) => {
      const chat = find(id)
      const arrived = message(id, from, text, now())
      chat.messages.push(arrived)
      chat.unread++
      if (mentions) chat.mentions++
      tell()
      return arrived
    },
    edit: (message, text) => {
      const chat = find(message.chat)
      const at = chat.messages.findIndex(candidate => candidate.id === message.id)
      if (at < 0) throw new Error('No such message')
      chat.messages[at] = { ...chat.messages[at], text }
      tell()
    },
    sent: () => outbox,
    saved: () => kept,
    drafts: () => drafts,
    file: (id, folders) => {
      find(id).folders = [...folders]
      tell()
    },
    loseAnswer: () => {
      losing = true
    },
    trouble: next => {
      trouble = next
      tell()
    },
  }
}
