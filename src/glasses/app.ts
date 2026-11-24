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
  text,
  wrapText,
  type Action,
  type Agent,
  type Glasses,
  type Lifetime,
  type Screen,
  type VoiceOptions,
} from 'earshot'
import type { Inbox } from '../inbox.ts'
import type { Chat, Drafter, Message, Messenger } from '../messenger.ts'

export interface Hearing {
  transcribe: VoiceOptions['transcribe']
  model?: VoiceOptions['model']
}

export interface GlassesParts {
  inbox: Inbox
  messenger: Messenger
  drafter: Drafter
  hearing?: Hearing
}

export interface GlassesApp {
  router: Router
  shell: Shell
}

const HISTORY = 6
const DIM = 2
const DRAFT_ROWS = Math.floor(SCREEN_HEIGHT / LINE_HEIGHT) - 2
const WORDS = {
  title: 'Paper Plane',
  noChats: 'Pick your chats on the phone',
  loading: 'Loading…',
  noLoad: 'Could not load this chat',
  noMessages: 'No messages yet',
  nothingToAnswer: 'Nothing to answer yet',
  drafting: 'Writing a reply…',
  noDraft: 'Could not write a reply',
  goBack: 'Double tap to go back',
  tapToSend: 'Tap to send',
  sending: 'Sending…',
  sent: 'Sent',
  notSent: 'Not sent. Tap to try again',
}

const label = (chat: Chat) => (chat.unread > 0 ? `${chat.title} (${chat.unread})` : chat.title)

const line = (chat: Chat | undefined, message: Message) =>
  message.mine ? `You: ${message.text}` : chat?.kind === 'person' ? message.text : `${message.from}: ${message.text}`

export function startGlasses(life: Lifetime, glasses: Glasses, parts: GlassesParts): GlassesApp {
  const { inbox, messenger, drafter, hearing } = parts
  let onChat: string | null = null
  let onDraft: string | null = null
  let held: string | null = null

  const titleOf = (id: string) => inbox.chat(id)?.title ?? 'Chat'

  const draftScreen = (id: string, said: string | null, recent: readonly Message[] = []): Screen => {
    let words = said
    let lines = said === null ? [] : wrapText(cleanText(said), SCREEN_WIDTH)
    let top = 0
    let state: 'writing' | 'unwritten' | 'ready' | 'sending' | 'failed' = said === null ? 'writing' : 'ready'
    let screen: Lifetime | null = null
    const last = () => Math.max(0, lines.length - DRAFT_ROWS)

    const write = async (entered: Lifetime) => {
      const chat = inbox.chat(id)
      let written: string
      try {
        if (!chat) throw new Error('No such chat')
        written = await entered.guard(drafter(chat, recent, entered.signal))
      } catch (error) {
        if (error instanceof LifetimeEnded) return
        state = 'unwritten'
        shell.redraw()
        return
      }
      words = written
      lines = wrapText(cleanText(written), SCREEN_WIDTH)
      state = 'ready'
      shell.redraw()
    }

    const send = action({
      id: 'send',
      say: 'Send',
      hint: 'Sends the reply on screen to this chat',
      blocked: () =>
        state === 'sending' ? WORDS.sending : state === 'writing' ? WORDS.drafting : state === 'unwritten' ? WORDS.noDraft : null,
      run: async () => {
        if (!screen || words === null) return
        state = 'sending'
        shell.redraw()
        try {
          await screen.guard(messenger.send(id, words))
        } catch (error) {
          if (error instanceof LifetimeEnded) return
          state = 'failed'
          shell.redraw()
          return
        }
        router.back()
        shell.notice(WORDS.sent)
      },
    })
    const scroll = (by: number) => () => {
      top = Math.max(0, Math.min(last(), top + by))
      shell.redraw()
    }
    const down = action({ id: 'draft-down', say: 'Scroll down', blocked: () => (top < last() ? null : 'That is the end'), run: scroll(2) })
    const up = action({ id: 'draft-up', say: 'Scroll up', blocked: () => (top > 0 ? null : 'That is the start'), run: scroll(-2) })
    const body = () =>
      state === 'writing' ? WORDS.drafting : state === 'unwritten' ? WORDS.noDraft : lines.slice(top, top + DRAFT_ROWS).join('\n')
    const foot = () =>
      state === 'ready' ? WORDS.tapToSend : state === 'sending' ? WORDS.sending : state === 'failed' ? WORDS.notSent : WORDS.goBack

    return {
      id: `draft:${id}`,
      actions: () => [send, down, up],
      context: () => `A reply to ${titleOf(id)}, not sent yet`,
      enter: entered => {
        screen = entered
        onDraft = id
        entered.own(() => {
          if (onDraft === id) onDraft = null
        })
        if (said === null) void write(entered)
      },
      view: () =>
        boxes(
          [
            {
              id: 'title',
              x: 0,
              y: 0,
              w: SCREEN_WIDTH,
              h: LINE_HEIGHT,
              text: fitText(oneLine(`To ${titleOf(id)}`), SCREEN_WIDTH),
              brightness: DIM,
            },
            { id: 'body', x: 0, y: LINE_HEIGHT, w: SCREEN_WIDTH, h: DRAFT_ROWS * LINE_HEIGHT, text: body() },
            { id: 'foot', x: 0, y: SCREEN_HEIGHT - LINE_HEIGHT, w: SCREEN_WIDTH, h: LINE_HEIGHT, text: foot(), brightness: DIM },
          ],
          { on: { tap: send, down, up } },
        ),
    }
  }

  const chatScreen = (id: string): Screen => {
    let messages: Message[] | null = null
    let failed = false
    let seen: string | null | undefined
    const load = async (entered: Lifetime) => {
      seen = inbox.chat(id)?.last?.id ?? null
      let loaded: Message[]
      try {
        loaded = await entered.guard(messenger.history(id, HISTORY))
      } catch (error) {
        if (error instanceof LifetimeEnded) return
        failed = true
        shell.redraw()
        return
      }
      messages = loaded
      failed = false
      shell.redraw()
      void entered.guard(messenger.read(id)).catch(() => {})
    }

    const draft = action({
      id: 'draft',
      say: 'Draft a reply',
      hint: 'Writes a suggested reply to check before it is sent',
      blocked: () => (messages?.some(message => !message.mine) ? null : WORDS.nothingToAnswer),
      run: () => {
        if (messages) router.open(draftScreen(id, null, messages))
      },
    })

    return {
      id: `chat:${id}`,
      actions: () => [draft],
      context: () => `The chat ${titleOf(id)}`,
      enter: entered => {
        onChat = id
        entered.own(() => {
          if (onChat === id) onChat = null
        })
        entered.own(
          inbox.onChange(() => {
            if ((inbox.chat(id)?.last?.id ?? null) !== seen) void load(entered)
          }),
        )
        void load(entered)
      },
      view: () =>
        text({
          title: titleOf(id),
          body: failed
            ? WORDS.noLoad
            : messages === null
              ? WORDS.loading
              : messages.length === 0
                ? WORDS.noMessages
                : [...messages]
                    .reverse()
                    .map(message => line(inbox.chat(id), message))
                    .join('\n\n'),
        }),
    }
  }

  const open: Action = action<Chat>({
    id: 'open',
    say: 'Open chat',
    hint: 'Shows the newest messages of one chat',
    targets: () => inbox.picked().map(chat => ({ id: chat.id, say: label(chat), value: chat })),
    run: chat => router.open(chatScreen(chat.id)),
  })

  const router: Router = new Router({
    home: {
      id: 'chats',
      context: () => 'The list of chats',
      view: () => list({ title: WORDS.title, action: open, empty: inbox.problem ?? WORDS.noChats }),
    },
    actions: () => [open],
  })

  const dictate: Agent = heard => {
    const chat = held
    const words = heard.words.trim()
    if (chat === null || !words || (onDraft ?? onChat) !== chat) return { kind: 'notMine' }
    if (onDraft === chat) router.replace(draftScreen(chat, words))
    else router.open(draftScreen(chat, words))
    return { kind: 'handled' }
  }

  const shell: Shell = new Shell(
    life,
    glasses,
    router,
    hearing
      ? {
          voice: {
            transcribe: hearing.transcribe,
            ...(hearing.model ? { model: hearing.model } : {}),
            agents: [dictate],
            otherwise: 'A reply to send to the chat on screen',
            onListen: () => {
              held = onDraft ?? onChat
            },
          },
        }
      : {},
  )
  life.own(inbox.onChange(() => shell.redraw()))

  return { router, shell }
}
