import { createStore, Lifetime, memoryPlace, type Store } from 'earshot'
import { fakeBridge } from 'earshot/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startApp } from './app.ts'
import { DEMO_CODE, demoAccount, type DemoSession } from './demo/account.ts'
import { DEMO_PICKS, demoMessenger } from './demo/messenger.ts'
import { display } from './glasses/display.ts'

const settle = (ms = 500) => vi.advanceTimersByTimeAsync(ms)
const SAMPLE_HOME = ['Paper Plane', '> Anna (2)', 'Launch crew (1)', 'Glasses news']
const NO_PICKS = ['Paper Plane', 'Pick your chats on the phone']

async function world(options: { signedIn?: boolean; telegram?: boolean; store?: Store } = {}) {
  const life = new Lifetime()
  const fake = fakeBridge()
  const store = options.store ?? createStore([memoryPlace()])
  const session: DemoSession = { signedIn: options.signedIn ?? false }
  const sample = demoMessenger(() => 1_700_000_000_000)
  const own = demoMessenger(() => 1_700_000_000_000)
  const app = await startApp({
    life,
    display: display(life, fake.bridge),
    store,
    sample: { messenger: sample, picks: DEMO_PICKS },
    ...(options.telegram === false ? {} : { telegram: { account: demoAccount(session), messenger: own } }),
  })
  await settle()
  const signIn = async () => {
    await app.signIn!.phone('+1 555 010 0199')
    await app.signIn!.code(DEMO_CODE)
    await settle()
  }
  return { app, life, fake, store, session, sample, own, signIn }
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

  it('keeps each account’s picks apart, and the user’s own for the next launch', async () => {
    const first = await world()
    await first.signIn()
    await first.app.inbox().pick(['sam'])
    await settle()
    expect(first.fake.lines()).toEqual(['Paper Plane', '> Sam'])
    const next = await world({ signedIn: true, store: first.store })
    expect(next.app.scope()).toBe('telegram')
    expect(next.fake.lines()).toEqual(['Paper Plane', '> Sam'])
    await next.app.signIn!.signOut()
    await settle()
    expect(next.fake.lines()).toEqual(SAMPLE_HOME)
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
