import { LifetimeEnded, type Lifetime, type Store } from 'earshot'
import { Agenda, type Diary } from './agenda.ts'
import { startGlasses, startWaiting, type Hearing } from './glasses/app.ts'
import type { Display } from './glasses/display.ts'
import { Inbox } from './inbox.ts'
import type { Account, Calendar, CalendarAccount, Messenger, Who, Writer } from './messenger.ts'
import { Connect } from './phone/calendar.ts'
import type { PhoneParts } from './phone/page.ts'
import type { Build } from './phone/privacy.ts'
import { SignIn } from './phone/signin.ts'
import { Phrases } from './phrases.ts'
import { UNREACHABLE } from './trouble.ts'

export type Scope = 'sample' | 'telegram' | 'connecting' | 'offline'

export interface AppParts {
  life: Lifetime
  display: Display
  store: Store
  sample: { messenger: Messenger; picks: readonly string[] }
  telegram?: { account: Account; messenger: Messenger }
  hearing?: Hearing
  writer?: Writer
  calendar?: { sample: Calendar; own?: { account: CalendarAccount; calendar: Calendar } }
  build?: Build
  phone?: (session: Lifetime, parts: PhoneParts) => void
}

export interface App {
  signIn: SignIn | null
  connect: Connect | null
  scope(): Scope
  inbox(): Inbox | null
}

const NOTES = {
  sample: 'These are sample chats. Pick the ones you want on your glasses.',
  telegram: 'Pick the chats you want on your glasses.',
  connecting: 'Connecting to Telegram…',
  offline: UNREACHABLE,
}
const ENDED = 'Signed out of Telegram'
const SAMPLE_TITLE = 'Sample chats'

export async function startApp(parts: AppParts): Promise<App> {
  const { life, display, store, sample, telegram, hearing, writer, phone } = parts
  const build = parts.build ?? { telegram: false, voice: false, calendar: false }
  const calendars = parts.calendar
  const connect = calendars?.own ? new Connect(life, calendars.own.account) : null
  let linked = false
  let shown: { who: Who | null } | null = null
  let diary: Diary | null = null
  let diaryLife: Lifetime | null = null
  const diaryListeners = new Set<() => void>()

  const book = (who: Who | null) => {
    diaryLife?.end()
    diaryLife = null
    diary = null
    const calendar = linked && calendars?.own ? calendars.own.calendar : who ? undefined : calendars?.sample
    const told = () => {
      for (const listener of [...diaryListeners]) listener()
    }
    if (calendar) {
      diaryLife = session.child()
      const agenda = new Agenda(diaryLife, calendar)
      diaryLife.own(agenda.onChange(told))
      diary = { calendar, agenda }
      void agenda.refresh()
    }
    told()
  }
  const phrases = new Phrases(store)
  await life.guard(phrases.start())
  let session = life.child()
  let scope: Scope = 'connecting'
  let inbox: Inbox | null = null

  const wait = () => {
    session.end()
    session = life.child()
    scope = 'connecting'
    inbox = null
    shown = null
    startWaiting(session, display, NOTES.connecting)
    phone?.(session, { inbox: null, phrases, signIn, connect, note: NOTES.connecting, build })
  }

  const show = (who: Who | null, ended = false) => {
    session.end()
    session = life.child()
    const current = session
    const messenger = who && telegram ? telegram.messenger : sample.messenger
    const opened = new Inbox(current, messenger, store, who ? `telegram:${who.id}` : 'sample')
    scope = who ? 'telegram' : 'sample'
    inbox = opened
    shown = { who }
    book(who)
    const { shell } = startGlasses(current, display, {
      ...(who ? {} : { title: SAMPLE_TITLE }),
      inbox: opened,
      messenger,
      phrases,
      ...(hearing ? { hearing } : {}),
      ...(writer ? { writer } : {}),
      diary: () => diary,
      onDiary: told => {
        diaryListeners.add(told)
        return () => void diaryListeners.delete(told)
      },
    })
    if (ended && !who) shell.notice(ENDED)
    phone?.(current, { inbox: opened, phrases, signIn, connect, note: NOTES[scope], build })
    const fill = async () => {
      await current.guard(opened.start())
      if (!who && opened.fresh) await current.guard(opened.pick(sample.picks))
    }
    void fill().catch(() => {})
  }

  const signIn: SignIn | null = telegram ? new SignIn(life, telegram.account, show) : null
  const kept = async (account: Pick<Account, 'known'>) => {
    try {
      return await life.guard(account.known())
    } catch (error) {
      if (error instanceof LifetimeEnded) throw error
      return false
    }
  }
  const known = telegram ? await life.guard(kept(telegram.account)) : false
  if (calendars?.own) {
    const { account } = calendars.own
    linked = await life.guard(kept(account))
    const relink = async () => {
      const now = await life.guard(kept(account))
      if (now === linked) return
      linked = now
      if (shown) book(shown.who)
    }
    life.own(account.onChange(() => void relink().catch(() => {})))
    void connect?.start()
  }
  if (known) wait()
  else show(null)
  const offline = (model: SignIn) => {
    session.end()
    session = life.child()
    scope = 'offline'
    inbox = null
    shown = null
    startWaiting(session, display, NOTES.offline, () => void retry(model))
    phone?.(session, { inbox: null, phrases, signIn, connect, note: NOTES.offline, build })
  }

  const retry = async (model: SignIn) => {
    wait()
    try {
      await life.guard(model.retry())
    } catch {
      return
    }
    if (scope === 'connecting') offline(model)
  }

  const restore = async (model: SignIn) => {
    let who: Who | null
    try {
      who = await life.guard(model.start(known))
    } catch {
      return
    }
    if (who) show(who)
    else if (known && model.view().step === 'offline') offline(model)
    else if (known) show(null, true)
  }
  if (signIn) void restore(signIn)
  return { signIn, connect, scope: () => scope, inbox: () => inbox }
}
