import { createStore, Lifetime, memoryPlace, type Store } from 'earshot'
import { fakeBridge } from 'earshot/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startApp } from './app.ts'
import { DEMO_CODE, DEMO_WHO, demoAccount, type DemoSession } from './demo/account.ts'
import { DEMO_PICKS, demoMessenger } from './demo/messenger.ts'
import { display } from './glasses/display.ts'
import type { Account, Who } from './messenger.ts'

const settle = (ms = 500) => vi.advanceTimersByTimeAsync(ms)
const SAMPLE_HOME = ['Sample chats', '> Anna (2)', 'Launch crew (1)', 'Glasses news']
const OFFLINE = ['Paper Plane', 'Cannot reach Telegram', 'Tap to try again']
const NO_PICKS = ['Paper Plane', 'Pick your chats on the phone']
const CONNECTING = ['Paper Plane', 'Connecting to Telegram…']

interface Options {
  signedIn?: boolean
  telegram?: boolean
  store?: Store
  who?: Who
  wrap?: (account: Account) => Account
}

async function world(options: Options = {}) {
  const life = new Lifetime()
  const fake = fakeBridge()
  const store = options.store ?? createStore([memoryPlace()])
  const session: DemoSession = { signedIn: options.signedIn ?? false }
  const sample = demoMessenger(() => 1_700_000_000_000)
  const own = demoMessenger(() => 1_700_000_000_000)
  const account = demoAccount(session, false, options.who ?? DEMO_WHO)
  const phones: string[] = []
  const app = await startApp({
    life,
    display: display(life, fake.bridge),
    store,
    sample: { messenger: sample, picks: DEMO_PICKS },
    ...(options.telegram === false ? {} : { telegram: { account: options.wrap ? options.wrap(account) : account, messenger: own } }),
    phone: (_, parts) => void phones.push(parts.note),
  })
  await settle()
  const signIn = async () => {
    await app.signIn!.phone('+1 555 010 0199')
    await app.signIn!.code(DEMO_CODE)
    await settle()
  }
  return { app, life, fake, store, session, sample, own, signIn, phones }
}

beforeEach(() => void vi.useFakeTimers())
afterEach(() => void vi.useRealTimers())

describe('which account the glasses show', () => {
  it('is the sample account, with its sample picks, until someone signs in', async () => {
    const { app, fake } = await world()
    expect(app.scope()).toBe('sample')
    expect(fake.lines()).toEqual(SAMPLE_HOME)
  })

  it('is the user’s own after sign-in, where nothing is picked yet', async () => {
    const { app, fake, signIn } = await world()
    await signIn()
    expect(app.scope()).toBe('telegram')
    expect(fake.lines()).toEqual(NO_PICKS)
  })

  it('keeps the user’s picks for the next launch, apart from the sample account’s', async () => {
    const first = await world()
    await first.signIn()
    await first.app.inbox()!.pick(['sam'])
    await settle()
    expect(first.fake.lines()).toEqual(['Paper Plane', '> Sam'])
    const next = await world({ signedIn: true, store: first.store })
    expect(next.app.scope()).toBe('telegram')
    expect(next.fake.lines()).toEqual(['Paper Plane', '> Sam'])
    await next.app.signIn!.signOut()
    await settle()
    expect(next.fake.lines()).toEqual(SAMPLE_HOME)
  })

  it('S1: gives a second user of the same phone none of the first user’s picks', async () => {
    const first = await world()
    await first.signIn()
    await first.app.inbox()!.pick(['sam', 'launch'])
    await settle()
    const second = await world({ signedIn: true, store: first.store, who: { id: 'someone-else', name: 'Someone else' } })
    expect(second.app.scope()).toBe('telegram')
    expect(second.fake.lines()).toEqual(NO_PICKS)
  })

  it('goes back to the sample account on sign-out, and the sign-in is gone', async () => {
    const { app, fake, signIn, session } = await world()
    await signIn()
    await app.signIn!.signOut()
    await settle()
    expect(session.signedIn).toBe(false)
    expect(app.scope()).toBe('sample')
    expect(fake.lines()).toEqual(SAMPLE_HOME)
  })

  it('A4: stops showing the account that was left: its messages no longer reach the glasses', async () => {
    const { fake, signIn, sample } = await world()
    await signIn()
    sample.arrive('anna', 'Anna', 'Still there?')
    await settle()
    expect(fake.lines()).toEqual(NO_PICKS)
  })

  it('has no sign-in at all in a build without Telegram', async () => {
    const { app, fake } = await world({ telegram: false })
    expect(app.signIn).toBeNull()
    expect(fake.lines()).toEqual(SAMPLE_HOME)
  })
})

describe('at launch, while Telegram has not answered yet', () => {
  const slow = () => {
    let answer = () => {}
    const wrap = (account: Account): Account => ({
      ...account,
      restore: async () => {
        await new Promise<void>(resolve => (answer = resolve))
        return account.restore()
      },
    })
    return { wrap, answer: () => answer() }
  }

  it('shows a returning user that it is connecting, on the glasses and on the phone, then their own chats', async () => {
    const telegram = slow()
    const { app, fake, phones } = await world({ signedIn: true, wrap: telegram.wrap })
    await settle(30_000)
    expect(app.scope()).toBe('connecting')
    expect(fake.lines()).toEqual(CONNECTING)
    expect(phones).toEqual(['Connecting to Telegram…'])
    telegram.answer()
    await settle()
    expect(app.scope()).toBe('telegram')
    expect(fake.lines()).toEqual(NO_PICKS)
  })

  it('shows a new user the sample chats at once', async () => {
    const telegram = slow()
    const { app, fake, phones } = await world({ wrap: telegram.wrap })
    expect(app.scope()).toBe('sample')
    expect(fake.lines()).toEqual(SAMPLE_HOME)
    expect(phones).toHaveLength(1)
  })

  it('falls back to the sample chats when the sign-in turns out to be gone', async () => {
    const telegram = slow()
    const made = await world({ signedIn: true, wrap: telegram.wrap })
    made.session.signedIn = false
    telegram.answer()
    await settle()
    expect(made.app.scope()).toBe('sample')
    expect(made.fake.lines()).toEqual(SAMPLE_HOME)
  })

  it('says on the glasses that Telegram cannot be reached, and never shows sample chats in the user’s place', async () => {
    let online = false
    const made = await world({
      signedIn: true,
      wrap: account => ({
        ...account,
        restore: async () => {
          if (!online) throw new Error('offline')
          return account.restore()
        },
      }),
    })
    expect(made.app.scope()).toBe('offline')
    expect(made.fake.lines()).toEqual(OFFLINE)
    made.fake.tap()
    await settle()
    expect(made.fake.lines()).toEqual(OFFLINE)
    online = true
    made.fake.tap()
    await settle()
    expect(made.app.scope()).toBe('telegram')
    expect(made.fake.lines()).toEqual(NO_PICKS)
  })

  it('shows the user’s chats when the phone page’s "Try again" gets through', async () => {
    let online = false
    const made = await world({
      signedIn: true,
      wrap: account => ({
        ...account,
        restore: async () => {
          if (!online) throw new Error('offline')
          return account.restore()
        },
      }),
    })
    online = true
    await made.app.signIn!.retry()
    await settle()
    expect(made.fake.lines()).toEqual(NO_PICKS)
  })
})
