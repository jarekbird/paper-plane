import { Lifetime } from 'earshot'
import { describe, expect, it } from 'vitest'
import { GoogleEnded, googleAccount, type GooglePlace } from './account.ts'
import { googleSide } from './testing.ts'

const live = () => new AbortController().signal

function world() {
  const side = googleSide()
  let kept: string | null = null
  let clock = 1_800_000_000_000
  const place: GooglePlace = { load: async () => kept, save: async next => void (kept = next) }
  const life = new Lifetime()
  const account = googleAccount(life, { relay: 'https://relay.example', place, ask: side.ask, now: () => clock })
  const connect = async () => account.finish(side.consent(await account.begin()), live())
  return { side, account, place, life, connect, kept: () => kept, later: (ms: number) => void (clock += ms) }
}

describe('the Google sign-in on the phone', () => {
  it('is not there until the user connects it', async () => {
    expect(await world().account.known()).toBe(false)
  })

  it('gives a page to open on the relay, with a pair that tells nothing of the secret it will be picked up with', async () => {
    const { account, side } = world()
    const link = new URL(await account.begin())
    expect(`${link.origin}${link.pathname}`).toBe('https://relay.example/google/start')
    expect(link.searchParams.get('pair')).toMatch(/^[A-Za-z0-9_-]{43}$/)
    await account.finish(side.consent(link.toString()), live())
    const sent = side.asked[0].body as { verifier: string; code: string }
    expect(sent.verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(link.toString()).not.toContain(sent.verifier)
  })

  it('is connected once the user typed the code from the page, keeps the sign-in on the phone, and tells listeners', async () => {
    const { account, connect, kept } = world()
    let told = 0
    account.onChange(() => told++)
    expect(await connect()).toBe(true)
    expect(await account.known()).toBe(true)
    expect(told).toBe(1)
    expect(Object.keys(JSON.parse(kept()!)).sort()).toEqual(['access', 'refresh', 'until'])
  })

  it('takes the code as it is read aloud or typed, with spaces', async () => {
    const { account, side } = world()
    side.consent(await account.begin())
    expect(await account.finish('482 913', live())).toBe(true)
  })

  it('is not connected by a wrong code, and has to start again: the relay kept nothing for a second try', async () => {
    const { account, side } = world()
    const code = side.consent(await account.begin())
    expect(await account.finish('000000', live())).toBe(false)
    const calls = side.asked.length
    expect(await account.finish(code, live())).toBe(false)
    expect(side.asked.length).toBe(calls)
    expect(await account.known()).toBe(false)
  })

  it('asks the relay nothing for a code typed before any sign-in was started', async () => {
    const { account, side } = world()
    expect(await account.finish('482913', live())).toBe(false)
    expect(side.asked).toEqual([])
  })

  it('uses the key it has while it is good, and renews it through the relay a minute before it runs out', async () => {
    const { account, connect, side, later } = world()
    await connect()
    const first = await account.token(live())
    later(58 * 60_000)
    expect(await account.token(live())).toBe(first)
    later(90_000)
    const second = await account.token(live())
    expect(second).not.toBe(first)
    expect(side.asked.at(-1)).toMatchObject({ host: 'relay.example', path: '/google/refresh' })
    expect(await account.token(live())).toBe(second)
  })

  it('forgets the sign-in, tells listeners and says it has ended when Google no longer renews it', async () => {
    const { account, connect, side, later, kept } = world()
    await connect()
    let told = 0
    account.onChange(() => told++)
    side.end()
    later(61 * 60_000)
    await expect(account.token(live())).rejects.toBeInstanceOf(GoogleEnded)
    expect(kept()).toBeNull()
    expect(told).toBe(1)
    expect(await account.known()).toBe(false)
  })

  it('keeps the sign-in when the relay cannot be reached to renew it', async () => {
    const made = world()
    await made.connect()
    made.later(61 * 60_000)
    const ask = made.side.ask
    const failing = googleAccount(new Lifetime(), {
      relay: 'https://relay.example',
      place: made.place,
      ask: async (input, init) => (String(input).includes('/google/refresh') ? new Response('{}', { status: 502 }) : ask(input, init)),
      now: () => 1_800_000_000_000 + 61 * 60_000,
    })
    await expect(failing.token(live())).rejects.not.toBeInstanceOf(GoogleEnded)
    expect(made.kept()).not.toBeNull()
  })

  it('signs out: the phone forgets the sign-in, Google is told to end it, and listeners are told', async () => {
    const { account, connect, side, kept } = world()
    await connect()
    const refresh = (JSON.parse(kept()!) as { refresh: string }).refresh
    let told = 0
    account.onChange(() => told++)
    await account.signOut()
    expect(kept()).toBeNull()
    expect(side.revoked).toEqual([refresh])
    expect(told).toBe(1)
  })

  it('A2: talks only to the relay and to Google', async () => {
    const { account, connect, side, later } = world()
    await connect()
    later(61 * 60_000)
    await account.token(live())
    await account.signOut()
    expect([...new Set(side.asked.map(call => call.host))].sort()).toEqual(['oauth2.googleapis.com', 'relay.example'])
  })

  it('S4: fails without a word of the sign-in', async () => {
    const { account, connect, kept, life } = world()
    await connect()
    const { refresh, access } = JSON.parse(kept()!) as { refresh: string; access: string }
    life.end()
    const error = await account.token(live()).catch((thrown: unknown) => thrown)
    expect(String((error as Error).message)).not.toContain(refresh)
    expect(String((error as Error).message)).not.toContain(access)
  })

  it('refuses a relay that is not https', () => {
    expect(() =>
      googleAccount(new Lifetime(), { relay: 'http://relay.example', place: { load: async () => null, save: async () => {} } }),
    ).toThrow()
  })
})
