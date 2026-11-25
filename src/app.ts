import type { Lifetime, Store } from 'earshot'
import { startGlasses, startWaiting, type Hearing } from './glasses/app.ts'
import type { Display } from './glasses/display.ts'
import { Inbox } from './inbox.ts'
import type { Account, Messenger, Who } from './messenger.ts'
import type { PhoneParts } from './phone/page.ts'
import { SignIn } from './phone/signin.ts'
import { Phrases } from './phrases.ts'

export type Scope = 'sample' | 'telegram' | 'connecting' | 'offline'

export interface AppParts {
  life: Lifetime
  display: Display
  store: Store
  sample: { messenger: Messenger; picks: readonly string[] }
  telegram?: { account: Account; messenger: Messenger }
  hearing?: Hearing
  phone?: (session: Lifetime, parts: PhoneParts) => void
}

export interface App {
  signIn: SignIn | null
  scope(): Scope
  inbox(): Inbox | null
}

const NOTES = {
  sample: 'These are sample chats. Pick the ones you want on your glasses.',
  telegram: 'Pick the chats you want on your glasses.',
  connecting: 'Connecting to Telegram…',
  offline: 'Cannot reach Telegram',
}
const SAMPLE_TITLE = 'Sample chats'

export async function startApp(parts: AppParts): Promise<App> {
  const { life, display, store, sample, telegram, hearing, phone } = parts
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
    startWaiting(session, display, NOTES.connecting)
    phone?.(session, { inbox: null, phrases, signIn, note: NOTES.connecting })
  }

  const show = (who: Who | null) => {
    session.end()
    session = life.child()
    const current = session
    const messenger = who && telegram ? telegram.messenger : sample.messenger
    const opened = new Inbox(current, messenger, store, who ? `telegram:${who.id}` : 'sample')
    scope = who ? 'telegram' : 'sample'
    inbox = opened
    startGlasses(current, display, {
      ...(who ? {} : { title: SAMPLE_TITLE }),
      inbox: opened,
      messenger,
      phrases,
      ...(hearing ? { hearing } : {}),
    })
    phone?.(current, { inbox: opened, phrases, signIn, note: NOTES[scope] })
    const fill = async () => {
      await current.guard(opened.start())
      if (!who && opened.fresh) await current.guard(opened.pick(sample.picks))
    }
    void fill().catch(() => {})
  }

  const signIn: SignIn | null = telegram ? new SignIn(life, telegram.account, show) : null
  const known = telegram ? await life.guard(telegram.account.known()) : false
  if (known) wait()
  else show(null)
  const offline = (model: SignIn) => {
    session.end()
    session = life.child()
    scope = 'offline'
    inbox = null
    startWaiting(session, display, NOTES.offline, () => void retry(model))
    phone?.(session, { inbox: null, phrases, signIn, note: NOTES.offline })
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
      who = await life.guard(model.start())
    } catch {
      return
    }
    if (who) show(who)
    else if (known && model.view().step === 'offline') offline(model)
    else if (known) show(null)
  }
  if (signIn) void restore(signIn)
  return { signIn, scope: () => scope, inbox: () => inbox }
}
