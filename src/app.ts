import { LifetimeEnded, type Lifetime, type Store } from 'earshot'
import { startGlasses, type Hearing } from './glasses/app.ts'
import type { Display } from './glasses/display.ts'
import { Inbox, type Scope } from './inbox.ts'
import type { Account, Messenger } from './messenger.ts'
import type { PhoneParts } from './phone/page.ts'
import { SignIn } from './phone/signin.ts'
import { Phrases } from './phrases.ts'

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
  inbox(): Inbox
}

const NOTES: Record<Scope, string> = {
  sample: 'These are sample chats. Pick the ones you want on your glasses.',
  telegram: 'Pick the chats you want on your glasses.',
}

export async function startApp(parts: AppParts): Promise<App> {
  const { life, display, store, sample, telegram, hearing, phone } = parts
  const phrases = new Phrases(store)
  await life.guard(phrases.start())
  let session = life.child()
  let scope: Scope = 'sample'
  let inbox = new Inbox(session, sample.messenger, store, scope)

  const use = async (next: Scope): Promise<void> => {
    session.end()
    session = life.child()
    const current = session
    const messenger = next === 'telegram' && telegram ? telegram.messenger : sample.messenger
    const opened = new Inbox(current, messenger, store, next)
    scope = next
    inbox = opened
    startGlasses(current, display, { inbox: opened, messenger, phrases, ...(hearing ? { hearing } : {}) })
    phone?.(current, { inbox: opened, phrases, signIn, note: NOTES[next] })
    try {
      await current.guard(opened.start())
      if (next === 'sample' && opened.fresh) await current.guard(opened.pick(sample.picks))
    } catch (error) {
      if (!(error instanceof LifetimeEnded)) throw error
    }
  }

  const signIn: SignIn | null = telegram ? new SignIn(life, telegram.account, signedIn => void use(signedIn ? 'telegram' : 'sample')) : null
  const signedIn = signIn ? await life.guard(signIn.start()) : false
  await life.guard(use(signedIn ? 'telegram' : 'sample'))
  return { signIn, scope: () => scope, inbox: () => inbox }
}
