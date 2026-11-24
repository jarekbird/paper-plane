import {
  action,
  boxes,
  cleanText,
  fitText,
  LifetimeEnded,
  LINE_HEIGHT,
  list,
  oneLine,
  Router,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  Shell,
  wrapText,
  type Action,
  type Agent,
  type Box,
  type Glasses,
  type Lifetime,
  type Screen,
  type Timer,
  type VoiceOptions,
} from 'earshot'
import type { Inbox } from '../inbox.ts'
import type { Chat, Message, Messenger } from '../messenger.ts'
import { findNamed } from '../names.ts'
import type { Phrases } from '../phrases.ts'
import { quickReplies } from '../replies.ts'

export interface Hearing {
  transcribe: VoiceOptions['transcribe']
  model?: VoiceOptions['model']
}

export interface GlassesParts {
  inbox: Inbox
  messenger: Messenger
  phrases: Phrases
  hearing?: Hearing
}

export interface GlassesApp {
  router: Router
  shell: Shell
}

const HISTORY = 6
const DIM = 2
const ROWS = Math.floor(SCREEN_HEIGHT / LINE_HEIGHT) - 2
const UNDO_MS = 5_000
// Earshot's list view keeps 20 px left of its rows for the cursor.
const ROW_WIDTH = SCREEN_WIDTH - 20
const WORDS = {
  title: 'Paper Plane',
  whichChat: 'Which chat?',
  noSuchChat: 'No chat by that name',
  nothingUnread: 'Nothing is unread',
  noChats: 'Pick your chats on the phone',
  loading: 'Loading…',
  noLoad: 'Could not load this chat',
  noMessages: 'No messages yet',
  tapToReply: 'Tap to reply',
  tapToSend: 'Tap to send',
  sending: 'Sending…',
  sent: 'Sent',
  notSent: 'Not sent. Tap to try again',
  undo: 'Sent. Tap to undo',
  undone: 'Taken back',
  notUndone: 'Could not take it back',
  nothingToUndo: 'Nothing to undo',
  end: 'That is the end',
  start: 'That is the start',
}

const label = (chat: Chat) => (chat.unread > 0 ? `${chat.title} (${chat.unread})` : chat.title)

const line = (chat: Chat | undefined, message: Message) =>
  message.mine ? `You: ${message.text}` : chat?.kind === 'person' ? message.text : `${message.from}: ${message.text}`

const page = (title: string, body: string, foot: string): Box[] => [
  { id: 'title', x: 0, y: 0, w: SCREEN_WIDTH, h: LINE_HEIGHT, text: fitText(oneLine(title), SCREEN_WIDTH), brightness: DIM },
  { id: 'body', x: 0, y: LINE_HEIGHT, w: SCREEN_WIDTH, h: ROWS * LINE_HEIGHT, text: body },
  { id: 'foot', x: 0, y: SCREEN_HEIGHT - LINE_HEIGHT, w: SCREEN_WIDTH, h: LINE_HEIGHT, text: foot, brightness: DIM },
]

function scroller(lines: () => readonly string[], redraw: () => void) {
  let top = 0
  const last = () => Math.max(0, lines().length - ROWS)
  const at = () => Math.min(top, last())
  const move = (by: number) => () => {
    top = Math.max(0, Math.min(last(), at() + by))
    redraw()
  }
  return {
    shown: () =>
      lines()
        .slice(at(), at() + ROWS)
        .join('\n'),
    down: action({ id: 'down', say: 'Scroll down', blocked: () => (at() < last() ? null : WORDS.end), run: move(2) }),
    up: action({ id: 'up', say: 'Scroll up', blocked: () => (at() > 0 ? null : WORDS.start), run: move(-2) }),
  }
}

export function startGlasses(life: Lifetime, glasses: Glasses, parts: GlassesParts): GlassesApp {
  const { inbox, messenger, phrases, hearing } = parts
  const sentIn = new Map<string, (message: Message) => void>()
  const chatOn = new WeakMap<Screen, { chat: string; covers: boolean }>()
  const choices = new WeakMap<Screen, () => Chat[]>()
  let held: Screen | null = null
  let said: { words: string } | null = null

  const titleOf = (id: string) => inbox.chat(id)?.title ?? 'Chat'
  const redraw = () => shell.redraw()

  const draftScreen = (id: string, given: string): Screen => {
    const words = cleanText(given).trim()
    const lines = wrapText(words, SCREEN_WIDTH)
    const scroll = scroller(() => lines, redraw)
    let state: 'ready' | 'sending' | 'failed' | 'sent' = 'ready'
    let screen: Lifetime | null = null

    const send = action({
      id: 'send',
      say: 'Send',
      hint: 'Sends the reply on screen to this chat',
      blocked: () => (state === 'sending' ? WORDS.sending : state === 'sent' ? WORDS.sent : null),
      run: async () => {
        if (!screen) return
        state = 'sending'
        redraw()
        let sent: Message
        try {
          sent = await screen.guard(messenger.send(id, words))
        } catch (error) {
          if (error instanceof LifetimeEnded) return
          state = 'failed'
          redraw()
          return
        }
        state = 'sent'
        if (router.current === self) router.back()
        else redraw()
        sentIn.get(id)?.(sent)
      },
    })
    const foot = () =>
      state === 'sending' ? WORDS.sending : state === 'failed' ? WORDS.notSent : state === 'sent' ? WORDS.sent : WORDS.tapToSend

    const self: Screen = {
      id: `draft:${id}`,
      actions: () => [send, scroll.down, scroll.up],
      context: () => 'A reply, not sent yet',
      enter: entered => {
        screen = entered
      },
      view: () => boxes(page(`To ${titleOf(id)}`, scroll.shown(), foot()), { on: { tap: send, down: scroll.down, up: scroll.up } }),
    }
    chatOn.set(self, { chat: id, covers: true })
    return self
  }

  const repliesScreen = (id: string, reply: Action): Screen => {
    const self: Screen = {
      id: `replies:${id}`,
      actions: () => [reply],
      context: () => 'Short answers to choose from',
      view: () => list({ title: `To ${titleOf(id)}`, action: reply }),
    }
    chatOn.set(self, { chat: id, covers: true })
    return self
  }

  const chatScreen = (id: string): Screen => {
    let messages: Message[] | null = null
    let failed = false
    let seen: string | null | undefined
    let sending = false
    let undo: { message: Message; timer: Timer } | null = null
    let screen: Lifetime | null = null
    let answers: Screen | null = null

    const lines = (): readonly string[] => {
      if (failed) return [WORDS.noLoad]
      if (messages === null) return [WORDS.loading]
      if (messages.length === 0) return [WORDS.noMessages]
      const chat = inbox.chat(id)
      const newestFirst = [...messages].reverse().map(message => line(chat, message))
      return wrapText(cleanText(newestFirst.join('\n\n')), SCREEN_WIDTH)
    }
    const scroll = scroller(lines, redraw)

    const load = async (entered: Lifetime) => {
      seen = inbox.chat(id)?.last?.id ?? null
      let loaded: Message[]
      try {
        loaded = await entered.guard(messenger.history(id, HISTORY))
      } catch (error) {
        if (error instanceof LifetimeEnded) return
        failed = true
        redraw()
        return
      }
      messages = loaded
      failed = false
      redraw()
      void entered.guard(messenger.read(id)).catch(() => {})
    }

    const sent = (message: Message) => {
      if (!screen) return
      undo?.timer.cancel()
      const timer = screen.timeout(() => {
        undo = null
        redraw()
      }, UNDO_MS)
      undo = { message, timer }
      redraw()
    }

    const takeBack = action({
      id: 'undo',
      say: 'Undo',
      hint: 'Takes back the message just sent',
      risk: 'voice',
      blocked: () => (undo ? null : WORDS.nothingToUndo),
      run: async () => {
        const pending = undo
        if (!pending || !screen) return
        pending.timer.cancel()
        undo = null
        redraw()
        try {
          await screen.guard(messenger.unsend(pending.message))
        } catch (error) {
          if (!(error instanceof LifetimeEnded)) shell.notice(WORDS.notUndone)
          return
        }
        shell.notice(WORDS.undone)
      },
    })

    const reply: Action = action<string>({
      id: 'reply',
      say: 'Reply',
      hint: 'Sends one short answer to the chat on screen',
      risk: 'voice',
      blocked: () => (sending ? WORDS.sending : null),
      targets: () => {
        const own = new Set(phrases.list())
        const newest = messages?.findLast(message => !message.mine)?.text ?? null
        return quickReplies(newest, phrases.list()).map(text => ({ id: text, say: text, value: text, private: own.has(text) }))
      },
      choose: () => {
        answers = repliesScreen(id, reply)
        router.open(answers)
      },
      run: async text => {
        if (!screen) return
        if (fitText(oneLine(text), ROW_WIDTH) !== text) {
          if (router.current === answers) router.replace(draftScreen(id, text))
          else router.open(draftScreen(id, text))
          return
        }
        sending = true
        let message: Message
        try {
          message = await screen.guard(messenger.send(id, text))
        } catch (error) {
          sending = false
          if (!(error instanceof LifetimeEnded)) shell.notice(WORDS.notSent)
          return
        }
        sending = false
        if (router.current === answers) router.back()
        sent(message)
      },
    })

    const self: Screen = {
      id: `chat:${id}`,
      actions: () => [reply, takeBack, scroll.down, scroll.up],
      context: () => 'One chat, newest message first',
      enter: entered => {
        screen = entered
        sentIn.set(id, sent)
        entered.own(() => {
          if (sentIn.get(id) === sent) sentIn.delete(id)
        })
        entered.own(
          inbox.onChange(() => {
            if ((inbox.chat(id)?.last?.id ?? null) !== seen) void load(entered)
          }),
        )
        void load(entered)
      },
      view: () =>
        boxes(page(titleOf(id), scroll.shown(), undo ? WORDS.undo : WORDS.tapToReply), {
          on: { tap: undo ? takeBack : reply, down: scroll.down, up: scroll.up },
        }),
    }
    chatOn.set(self, { chat: id, covers: false })
    return self
  }

  const chatTargets = (chats: readonly Chat[]) => chats.map(chat => ({ id: chat.id, say: label(chat), value: chat, private: true }))

  const named = () => {
    const heard = said
    said = null
    return heard ? findNamed(heard.words, inbox.picked()) : { matches: [], rest: '' }
  }

  const pick = (among: readonly Chat[]) => {
    const offered = () => (among.length ? inbox.picked().filter(chat => among.some(wanted => wanted.id === chat.id)) : inbox.picked())
    const one = action<Chat>({
      id: 'open-one',
      say: 'Open chat',
      targets: () => chatTargets(offered()),
      run: chat => router.jump(chatScreen(chat.id)),
    })
    const picker: Screen = {
      id: 'pick-chat',
      actions: () => [one],
      context: () => 'A list of chats to choose one from',
      view: () => list({ title: WORDS.whichChat, action: one, empty: WORDS.noChats }),
    }
    choices.set(picker, offered)
    router.open(picker)
  }

  const open: Action = action<Chat>({
    id: 'open',
    say: 'Open chat',
    hint: 'Shows the newest messages of one chat, which the user may name',
    targets: () => chatTargets(inbox.picked()),
    choose: () => {
      const { matches } = named()
      if (matches.length === 1) router.jump(chatScreen(matches[0].id))
      else pick(matches)
    },
    run: chat => router.open(chatScreen(chat.id)),
  })

  const message: Action = action<Chat>({
    id: 'message',
    say: 'Message someone',
    hint: 'Starts a message to a chat the user names, with the words that follow the name',
    targets: () => chatTargets(inbox.picked()),
    choose: () => {
      const { matches, rest } = named()
      if (matches.length !== 1) pick(matches)
      else if (rest) router.jump(chatScreen(matches[0].id), draftScreen(matches[0].id, rest))
      else router.jump(chatScreen(matches[0].id))
    },
    run: chat => router.open(chatScreen(chat.id)),
  })

  const readAll = action({
    id: 'read-all',
    say: 'Mark all read',
    hint: 'Marks every chat on the list as read',
    risk: 'voice',
    blocked: () => (inbox.picked().some(chat => chat.unread > 0) ? null : WORDS.nothingUnread),
    run: async () => {
      const unread = inbox.picked().filter(chat => chat.unread > 0)
      await life.guard(Promise.all(unread.map(chat => messenger.read(chat.id))))
    },
  })

  const router: Router = new Router({
    home: {
      id: 'chats',
      context: () => 'The list of chats',
      view: () => list({ title: WORDS.title, action: open, empty: inbox.problem ?? WORDS.noChats }),
    },
    actions: () => [open, message, readAll],
  })

  const choose: Agent = heard => {
    const offered = held && router.current === held ? choices.get(held) : undefined
    if (!offered) return { kind: 'notMine' }
    const { matches } = findNamed(heard.words, offered())
    if (matches.length !== 1) return { kind: 'handled', say: WORDS.noSuchChat }
    router.jump(chatScreen(matches[0].id))
    return { kind: 'handled' }
  }

  const dictate: Agent = heard => {
    const on = held && router.current === held ? chatOn.get(held) : undefined
    const words = heard.words.trim()
    if (!on || !words) return { kind: 'notMine' }
    if (on.covers) router.replace(draftScreen(on.chat, words))
    else router.open(draftScreen(on.chat, words))
    return { kind: 'handled' }
  }

  const shell: Shell = new Shell(
    life,
    glasses,
    router,
    hearing
      ? {
          voice: {
            transcribe: async (audio, turn) => {
              const words = await turn.guard(hearing.transcribe(audio, turn))
              const mine = words ? { words } : null
              said = mine
              turn.own(() => {
                void Promise.resolve().then(() => {
                  if (said === mine) said = null
                })
              })
              return words
            },
            ...(hearing.model ? { model: hearing.model } : {}),
            agents: [choose, dictate],
            otherwise: 'A reply to send to the chat on screen, or the name of a chat to choose',
            onListen: () => {
              said = null
              held = router.current
            },
          },
        }
      : {},
  )
  life.own(inbox.onChange(redraw))
  life.own(phrases.onChange(redraw))

  return { router, shell }
}
