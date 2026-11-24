import type { Chat, ChatKind, Message, Messenger } from '../messenger.ts'

interface DemoChat {
  id: string
  title: string
  kind: ChatKind
  unread: number
  messages: Message[]
}

const MINUTE = 60_000

const SCRIPT: { id: string; title: string; kind: ChatKind; unread: number; lines: [from: string, text: string][] }[] = [
  {
    id: 'anna',
    title: 'Anna',
    kind: 'person',
    unread: 2,
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
    lines: [
      ['Ben', 'Build is green.'],
      ['You', 'Shipping after the review.'],
      ['Cy', 'Can someone confirm the demo time for Thursday?'],
    ],
  },
  {
    id: 'news',
    title: 'Glasses news',
    kind: 'channel',
    unread: 0,
    lines: [['Glasses news', 'Heads Up build week has started.']],
  },
  {
    id: 'sam',
    title: 'Sam',
    kind: 'person',
    unread: 0,
    lines: [['Sam', 'Thanks for yesterday.']],
  },
]

export const DEMO_PICKS: readonly string[] = ['anna', 'launch', 'news']

export interface DemoMessenger extends Messenger {
  arrive(chat: string, from: string, text: string): Message
  sent(): readonly Message[]
  saved(): readonly Message[]
  drafts(): ReadonlyMap<string, string>
}

export function demoMessenger(now: () => number = Date.now): DemoMessenger {
  let serial = 0
  const listeners = new Set<() => void>()
  const outbox: Message[] = []
  const kept: Message[] = []
  const drafts = new Map<string, string>()
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
    messages: entry.lines.map(([from, text], index) => message(entry.id, from, text, started - (entry.lines.length - index) * MINUTE)),
  }))
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
    chats: async (): Promise<Chat[]> =>
      [...chats].sort(newestFirst).map(chat => ({
        id: chat.id,
        title: chat.title,
        kind: chat.kind,
        unread: chat.unread,
        last: chat.messages.at(-1) ?? null,
      })),
    history: async (id, limit) => find(id).messages.slice(-limit),
    send: async (id, text) => {
      const chat = find(id)
      const sent = message(id, 'You', text, now())
      chat.messages.push(sent)
      outbox.push(sent)
      tell()
      return sent
    },
    read: async id => {
      const chat = find(id)
      if (chat.unread === 0) return
      chat.unread = 0
      tell()
    },
    unsend: async sent => {
      const chat = find(sent.chat)
      const at = chat.messages.findIndex(message => message.id === sent.id && message.mine)
      if (at < 0) throw new Error('No such message')
      chat.messages.splice(at, 1)
      tell()
    },
    keep: async (id, text) => {
      find(id)
      if (drafts.has(id)) return false
      drafts.set(id, text)
      return true
    },
    save: async message => {
      const found = find(message.chat).messages.find(candidate => candidate.id === message.id)
      if (!found) throw new Error('No such message')
      kept.push(found)
    },
    like: async message => {
      const chat = find(message.chat)
      const at = chat.messages.findIndex(candidate => candidate.id === message.id)
      if (at < 0) throw new Error('No such message')
      chat.messages[at] = { ...chat.messages[at], liked: true }
      tell()
    },
    onChange: told => {
      listeners.add(told)
      return () => void listeners.delete(told)
    },
    arrive: (id, from, text) => {
      const chat = find(id)
      const arrived = message(id, from, text, now())
      chat.messages.push(arrived)
      chat.unread++
      tell()
      return arrived
    },
    sent: () => outbox,
    saved: () => kept,
    drafts: () => drafts,
  }
}
