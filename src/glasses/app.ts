import {
  action,
  boxes,
  cleanText,
  fitText,
  LifetimeEnded,
  LINE_HEIGHT,
  list,
  matchWords,
  oneLine,
  Router,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  Shell,
  text,
  wrapText,
  type Action,
  type Agent,
  type Box,
  type Lifetime,
  type NavigatorModel,
  type Screen,
  type Timer,
  type VoiceOptions,
} from 'earshot'
import type { Inbox } from '../inbox.ts'
import type { Display } from './display.ts'
import { instructed } from '../instruction.ts'
import type { Chat, Message, Messenger, Sponsored, Writer } from '../messenger.ts'
import { addressed, commandOf, findNamed, sameWords } from '../names.ts'
import type { Phrases } from '../phrases.ts'
import { quickReplies } from '../replies.ts'

export interface Hearing {
  transcribe: VoiceOptions['transcribe']
  model?: VoiceOptions['model']
}

export interface GlassesParts {
  title?: string
  inbox: Inbox
  messenger: Messenger
  phrases: Phrases
  hearing?: Hearing
  writer?: Writer
}

export interface GlassesApp {
  router: Router
  shell: Shell
}

const HISTORY = 6
const DIM = 2
const ROWS = Math.floor(SCREEN_HEIGHT / LINE_HEIGHT) - 2
const UNDO_MS = 5_000
// Where a reply can be meant: on typesafe/jev-1.14 on 2026-11-25 every command tried scored 0.68 or more ("go home" the lowest) and no dictated reply reached 0.6 for a command but one harmless scroll (docs/proof/voice/live.md).
const SURE = 0.6
const REPLY = 'Reply'
const REPLY_LEAD = /^\s*(?:reply|answer|say)\s+/i
// Tried on typesafe/jev-1.14 on 2026-11-25 (docs/proof/voice/live.md): with this wording the navigator took a dictated reply for a command far less often.
const A_MESSAGE =
  'A message to send to the person in the chat on screen. Choose this when the words are something one would write to a person, or are more than one short command'
const WRITE_MS = 12_000
const LIKED = '👍'
// Earshot's list view keeps 20 px left of its rows for the cursor.
const ROW_WIDTH = SCREEN_WIDTH - 20
const WORDS = {
  title: 'Paper Plane',
  tapToRetry: 'Tap to try again',
  whichChat: 'Which chat?',
  noSuchChat: 'No chat by that name',
  nothingUnread: 'Nothing is unread',
  listedChats: 'the chats on the list',
  notRead: 'Could not mark them read',
  noChats: 'Pick your chats on the phone',
  loading: 'Loading…',
  noLoad: 'Could not load this chat',
  noMessages: 'No messages yet',
  tapToReply: 'Tap to reply',
  readOnly: 'Read only',
  sponsored: 'Sponsored',
  tapToSend: 'Tap to send',
  sending: 'Sending…',
  writing: 'Writing it out…',
  notWritten: 'Could not write it out',
  sent: 'Sent',
  keeping: 'Keeping…',
  kept: 'Kept as a draft',
  draftWaiting: 'Your phone already has a draft',
  notKept: 'Could not keep it',
  newestMessage: 'the top message from someone else',
  nothingFromOthers: 'No message from someone else on screen',
  liked: 'Liked',
  alreadyLiked: 'Already liked',
  notLiked: 'Could not like it',
  saved: 'Saved',
  notSaved: 'Could not save it',
  notSent: 'Not sent. Tap to try again',
  undo: 'Sent. Tap to undo',
  undone: 'Taken back',
  notUndone: 'Could not take it back',
  nothingToUndo: 'Nothing to undo',
  end: 'That is the end',
  start: 'That is the start',
}

const showable = (words: string) => {
  const shown = cleanText(words).trim()
  return /[\p{L}\p{N}]/u.test(shown) ? shown : ''
}

const label = (chat: Chat) => (chat.unread > 0 ? `${chat.title} (${chat.unread})` : chat.title)

const line = (chat: Chat | undefined, message: Message) => {
  const text = message.mine ? `You: ${message.text}` : chat?.kind === 'group' ? `${message.from}: ${message.text}` : message.text
  return message.liked ? `${text} ${LIKED}` : text
}

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
    top: at,
    reset: () => {
      top = 0
    },
    shown: () =>
      lines()
        .slice(at(), at() + ROWS)
        .join('\n'),
    down: action({ id: 'down', say: 'Scroll down', blocked: () => (at() < last() ? null : WORDS.end), run: move(2) }),
    up: action({ id: 'up', say: 'Scroll up', blocked: () => (at() > 0 ? null : WORDS.start), run: move(-2) }),
  }
}

async function unlessSure(asked: Promise<Record<string, number>>, commands: readonly { id: string }[], otherwise: { id: string }) {
  const chances = await asked
  const sure = commands.find(option => (chances[option.id] ?? 0) >= SURE)
  return { [(sure ?? otherwise).id]: 1 }
}

export function startWaiting(life: Lifetime, shown: Display, body: string, retry?: () => void): void {
  const again = action({ id: 'retry', say: 'Try again', run: () => retry?.() })
  const router = new Router({
    home: {
      id: 'waiting',
      actions: () => (retry ? [again] : []),
      view: () => (retry ? boxes(page(WORDS.title, body, WORDS.tapToRetry), { on: { tap: again } }) : text({ title: WORDS.title, body })),
    },
  })
  life.own(() => router.close())
  new Shell(life, shown.glasses, router)
}

export function startGlasses(life: Lifetime, shown: Display, parts: GlassesParts): GlassesApp {
  const { inbox, messenger, phrases, hearing, writer } = parts
  const { glasses, upToDate } = shown
  const unseen = () => (upToDate() ? null : WORDS.loading)
  const sentIn = new Map<string, (message: Message) => void>()
  const chatOn = new WeakMap<Screen, { chat: string; covers: boolean }>()
  const choices = new WeakMap<Screen, () => Chat[]>()
  let held: Screen | null = null
  let said: { words: string } | null = null

  const titleOf = (id: string) => inbox.chat(id)?.title ?? 'Chat'
  const redraw = () => shell.redraw()

  const draftScreen = (id: string, given: string, spoken = false): Screen => {
    const asSaid = showable(given)
    let words = asSaid
    let lines = wrapText(words, SCREEN_WIDTH)
    const scroll = scroller(() => lines, redraw)
    let state: 'ready' | 'writing' | 'sending' | 'failed' | 'sent' | 'keeping' | 'kept' = 'ready'
    let unwritten = spoken && writer !== undefined && instructed(asSaid)
    const show = (text: string) => {
      words = text
      lines = wrapText(words, SCREEN_WIDTH)
      scroll.reset()
    }
    const busy = () =>
      state === 'writing'
        ? WORDS.writing
        : state === 'sending'
          ? WORDS.sending
          : state === 'sent'
            ? WORDS.sent
            : state === 'keeping'
              ? WORDS.keeping
              : state === 'kept'
                ? WORDS.kept
                : null
    let screen: Lifetime | null = null

    const send = action({
      id: 'send',
      say: 'Send',
      hint: 'Sends the reply on screen to this chat',
      risk: 'voice',
      blocked: () => busy() ?? unseen(),
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
    const keep = action({
      id: 'keep',
      say: 'Keep for later',
      hint: 'Keeps the reply as a draft in Telegram, to finish on the phone',
      risk: 'voice',
      blocked: () => busy() ?? unseen(),
      run: async () => {
        if (!screen) return
        const before = state
        state = 'keeping'
        redraw()
        let kept: boolean
        try {
          kept = await life.guard(messenger.keep(id, words, life.signal))
        } catch (error) {
          if (error instanceof LifetimeEnded) return
          state = before
          shell.notice(WORDS.notKept)
          return
        }
        if (!kept) {
          state = before
          shell.notice(WORDS.draftWaiting)
          return
        }
        state = 'kept'
        if (router.current === self) router.back()
        shell.notice(WORDS.kept)
      },
    })
    const writeOut = async () => {
      if (!screen || !writer) return
      const shown = screen
      const turn = shown.child()
      turn.timeout(() => turn.end(), WRITE_MS)
      const before = state
      state = 'writing'
      redraw()
      let written = ''
      try {
        written = showable(await turn.guard(writer.write(asSaid, turn.signal)))
      } catch {
        written = ''
      }
      turn.end()
      if (shown.ended) return
      state = before
      if (written) show(written)
      else shell.notice(WORDS.notWritten)
      redraw()
    }
    const write = action({
      id: 'write',
      say: 'Write it out',
      hint: 'Turns what was said into a full message, to check before it is sent',
      blocked: busy,
      run: writeOut,
    })
    const revert = action({
      id: 'as-said',
      say: 'As I said it',
      hint: 'Puts back the words exactly as they were said',
      blocked: busy,
      run: () => {
        show(asSaid)
        redraw()
      },
    })
    const foot = () => busy() ?? (state === 'failed' ? WORDS.notSent : WORDS.tapToSend)

    const self: Screen = {
      id: `draft:${id}`,
      actions: () => [send, keep, ...(writer && spoken ? [words === asSaid ? write : revert] : []), scroll.down, scroll.up],
      context: () => 'A reply, not sent yet',
      enter: entered => {
        screen = entered
        if (!unwritten) return
        unwritten = false
        void writeOut()
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
    let started = 0
    let readUpTo: string | null | undefined
    let seenClear: string | null = null
    let pending = false
    let sending = false
    let undo: { message: Message; timer: Timer } | null = null
    let screen: Lifetime | null = null
    let answers: Screen | null = null
    const channel = inbox.chat(id)?.kind === 'channel'
    let ad: Sponsored | null = null
    let adAsked = false
    let adSeen = false
    let adStartSeen = false

    const layout = (): {
      lines: string[]
      blocks: { message: Message; from: number; to: number }[]
      ad: { from: number; to: number } | null
    } => {
      if (failed) return { lines: [WORDS.noLoad], blocks: [], ad: null }
      if (messages === null) return { lines: [WORDS.loading], blocks: [], ad: null }
      if (messages.length === 0) return { lines: [WORDS.noMessages], blocks: [], ad: null }
      const chat = inbox.chat(id)
      const lines: string[] = []
      const blocks: { message: Message; from: number; to: number }[] = []
      for (const message of [...messages].reverse()) {
        if (lines.length) lines.push('')
        const wrapped = wrapText(cleanText(line(chat, message)), SCREEN_WIDTH)
        blocks.push({ message, from: lines.length, to: lines.length + wrapped.length })
        lines.push(...wrapped)
      }
      if (!ad) return { lines, blocks, ad: null }
      const from = lines.length + 1
      lines.push(
        '',
        ...wrapText(cleanText(`${WORDS.sponsored}: ${ad.title}`), SCREEN_WIDTH),
        ...wrapText(cleanText(ad.text), SCREEN_WIDTH),
        ...wrapText(oneLine(ad.link.replace(/^https?:\/\//, '')), SCREEN_WIDTH),
      )
      return { lines, blocks, ad: { from, to: lines.length } }
    }
    const scroll = scroller(() => layout().lines, redraw)
    const inView = (): Message[] => {
      const top = scroll.top()
      return layout()
        .blocks.filter(block => block.from < top + ROWS && block.to > top)
        .map(block => block.message)
    }

    const load = async (entered: Lifetime) => {
      const turn = ++started
      pending = true
      let loaded: Message[]
      try {
        loaded = await entered.guard(messenger.history(id, HISTORY))
      } catch (error) {
        if (error instanceof LifetimeEnded || turn !== started) return
        pending = false
        failed = true
        redraw()
        return
      }
      if (turn !== started) return
      pending = false
      messages = loaded
      failed = false
      redraw()
      markRead(entered)
      if (channel && !adAsked) void sponsor(entered)
    }
    const sponsor = async (entered: Lifetime) => {
      adAsked = true
      try {
        ad = await entered.guard(messenger.sponsored(id))
      } catch {
        return
      }
      redraw()
    }
    const sawAd = (entered: Lifetime) => {
      const at = layout().ad
      const top = scroll.top()
      if (!ad || adSeen || !at || !upToDate()) return
      adStartSeen ||= at.from >= top && at.from < top + ROWS
      if (!adStartSeen || at.to > top + ROWS || at.to <= top) return
      adSeen = true
      void entered.guard(messenger.sawSponsored(ad)).catch(() => {
        adSeen = false
      })
    }
    const markRead = (entered: Lifetime) => {
      const newestId = messages?.at(-1)?.id ?? null
      if (pending || failed || newestId === readUpTo || (inbox.chat(id)?.unread ?? 0) === 0) return
      readUpTo = newestId
      void entered.guard(messenger.read(id)).catch(() => {
        if (readUpTo === newestId) readUpTo = undefined
      })
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

    const current = () => !pending && !failed && messages !== null
    const keyOf = (message: Message) => `${message.id}\n${message.text}`
    const inSight = () => (current() && upToDate() ? (inView().find(message => !message.mine) ?? null) : null)
    const seen = (message: Message) => keyOf(message) === seenClear
    const newest = () => {
      const message = inSight()
      return message && seen(message) ? message : null
    }
    const onNewest = (spec: {
      id: string
      say: string
      hint: string
      done: string
      failed: string
      refused?: (message: Message) => string | null
      act: (message: Message) => Promise<void>
    }) => {
      let acting = false
      const run = async (message: Message) => {
        if (!screen || acting) return
        const entered = screen
        acting = true
        try {
          await entered.guard(spec.act(message))
        } catch (error) {
          acting = false
          if (!(error instanceof LifetimeEnded)) shell.notice(spec.failed)
          return
        }
        acting = false
        shell.notice(spec.done)
      }
      return action<Message>({
        id: spec.id,
        say: spec.say,
        hint: spec.hint,
        risk: 'voice',
        blocked: () => {
          if (!current() || !upToDate()) return WORDS.loading
          const message = inSight()
          if (!message) return WORDS.nothingFromOthers
          return seen(message) ? (spec.refused?.(message) ?? null) : WORDS.loading
        },
        targets: () => {
          const message = newest()
          return message ? [{ id: keyOf(message), say: WORDS.newestMessage, value: message }] : []
        },
        choose: () => {
          const message = newest()
          if (message) void run(message)
        },
        run,
      })
    }
    const like = onNewest({
      id: 'like',
      say: 'Like',
      hint: 'Sends a thumbs-up to the first message from someone else that is on screen',
      done: WORDS.liked,
      failed: WORDS.notLiked,
      refused: message => (message.liked ? WORDS.alreadyLiked : null),
      act: message => messenger.like(message),
    })
    const save = onNewest({
      id: 'save',
      say: 'Save',
      hint: 'Copies the first message from someone else that is on screen to Saved Messages',
      done: WORDS.saved,
      failed: WORDS.notSaved,
      act: message => messenger.save(message),
    })

    const reply: Action = action<string>({
      id: 'reply',
      say: REPLY,
      hint: 'Sends one short answer to the chat on screen',
      risk: 'voice',
      blocked: () => (sending ? WORDS.sending : unseen()),
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
      actions: () => (channel ? [like, save, scroll.down, scroll.up] : [reply, like, save, takeBack, scroll.down, scroll.up]),
      context: () => 'One chat, newest message first',
      enter: entered => {
        screen = entered
        sentIn.set(id, sent)
        entered.own(() => {
          if (sentIn.get(id) === sent) sentIn.delete(id)
        })
        entered.own(messenger.onChange(() => void load(entered)))
        entered.own(
          shown.onClear(() => {
            if (router.current !== self) return
            const message = inSight()
            seenClear = message ? keyOf(message) : null
            sawAd(entered)
          }),
        )
        entered.own(inbox.onChange(() => markRead(entered)))
        void load(entered)
      },
      view: () =>
        channel
          ? boxes(page(titleOf(id), scroll.shown(), WORDS.readOnly), { on: { down: scroll.down, up: scroll.up } })
          : boxes(page(titleOf(id), scroll.shown(), undo ? WORDS.undo : WORDS.tapToReply), {
              on: { tap: undo ? takeBack : reply, down: scroll.down, up: scroll.up },
            }),
    }
    if (!channel) chatOn.set(self, { chat: id, covers: false })
    return self
  }

  const chatTargets = (chats: readonly Chat[]) => chats.map(chat => ({ id: chat.id, say: label(chat), value: chat, private: true }))

  const named = () => {
    const heard = said
    said = null
    return heard ? addressed(heard.words, inbox.picked()) : { matches: [], rest: '', at: null }
  }

  const pick = (among: readonly Chat[]) => {
    const offered = () => (among.length ? inbox.picked().filter(chat => among.some(wanted => wanted.id === chat.id)) : inbox.picked())
    const one = action<Chat>({
      id: 'open-one',
      say: 'Choose chat',
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
      else if (showable(rest) && matches[0].kind !== 'channel')
        router.jump(chatScreen(matches[0].id), draftScreen(matches[0].id, rest, true))
      else router.jump(chatScreen(matches[0].id))
    },
    run: chat => router.open(chatScreen(chat.id)),
  })

  const unread = () =>
    inbox
      .picked()
      .filter(chat => chat.unread > 0)
      .map(chat => chat.id)
      .sort()
  const markRead = async (ids: readonly string[]) => {
    await life.guard(Promise.all(ids.map(id => messenger.read(id))))
  }

  const readAll = action<readonly string[]>({
    id: 'read-all',
    say: 'Mark all read',
    hint: 'Marks every chat on the list as read',
    risk: 'voice',
    blocked: () => (unread().length ? null : WORDS.nothingUnread),
    targets: () => {
      const ids = unread()
      return [{ id: ids.join(' '), say: WORDS.listedChats, value: ids }]
    },
    choose: () =>
      void markRead(unread()).then(redraw, error => {
        if (!(error instanceof LifetimeEnded)) shell.notice(WORDS.notRead)
      }),
    run: markRead,
  })

  const router: Router = new Router({
    home: {
      id: 'chats',
      context: () => 'The list of chats',
      view: () => list({ title: parts.title ?? WORDS.title, action: open, empty: inbox.problem ?? WORDS.noChats }),
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
    const words = showable(heard.words)
    if (!on || !words) return { kind: 'notMine' }
    if (on.covers) router.replace(draftScreen(on.chat, words, true))
    else router.open(draftScreen(on.chat, words, true))
    return { kind: 'handled' }
  }

  const asked = hearing?.model ?? matchWords
  const model: NavigatorModel = {
    choose: (question, turn) => {
      const command = commandOf(question.words)
      const offered = question.options.filter(option => option.role === undefined)
      const pass = question.options.find(passed => passed.role === 'pass')
      const replies = pass && chatOn.has(router.current)
      if (replies && instructed(question.words)) return Promise.resolve({ [pass.id]: 1 })
      if (command && !offered.some(option => sameWords(option.say, question.words))) {
        const meant = command === 'message' ? message : open
        const replying = replies && addressed(question.words, inbox.picked()).matches.length === 0
        const option = replying ? pass : offered.find(one => one.say === meant.say)
        if (option) return Promise.resolve({ [option.id]: 1 })
      }
      if (!replies) return asked.choose(question, turn)
      const answer = (text: string) => sameWords(`${REPLY}: ${question.words.replace(REPLY_LEAD, '')}`, text)
      const answered = offered.find(option => answer(option.say))
      if (answered) return Promise.resolve({ [answered.id]: 1 })
      const commands = offered.filter(option => !option.say.startsWith(`${REPLY}: `))
      const told = { ...question, options: question.options.map(option => (option === pass ? { ...option, say: A_MESSAGE } : option)) }
      return unlessSure(asked.choose(told, turn), commands, pass)
    },
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
            model,
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
  life.own(() => router.close())
  life.own(
    shown.onUncover(() => {
      void Promise.resolve().then(redraw)
    }),
  )
  life.own(inbox.onChange(redraw))
  life.own(phrases.onChange(redraw))

  return { router, shell }
}
