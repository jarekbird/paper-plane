import { Lifetime } from 'earshot'
import { describe, expect, it } from 'vitest'
import { calendarAccountContract } from '../calendar-account.contract.ts'
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
  return { side, account, place, life, connect, kept: () => kept, later: (ms: number) => void (clock += ms), now: () => clock }
}

calendarAccountContract('the Google sign-in, over a stand-in for Google and the relay', async () => {
  const made = world()
  return { account: made.account, signInAt: async link => made.side.consent(link), wrongCode: '000000' }
})

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
    expect(await account.token(live())).toEqual(first)
    later(90_000)
    const second = await account.token(live())
    expect(second.value).not.toBe(first.value)
    expect(side.asked.at(-1)).toMatchObject({ host: 'relay.example', path: '/google/refresh' })
    expect(await account.token(live())).toEqual(second)
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

  const tick = () => new Promise(resolve => setTimeout(resolve, 0))
  const until = async (ready: () => boolean) => {
    for (let turn = 0; turn < 200 && !ready(); turn++) await tick()
    expect(ready()).toBe(true)
  }
  const answersLate = (made: ReturnType<typeof world>, path: string) => {
    const real = made.side.ask
    const waiting: (() => void)[] = []
    const ask: typeof fetch = async (input, init) => {
      const answer = await real(input, init)
      if (String(input).endsWith(path)) await new Promise<void>(resolve => waiting.push(resolve))
      return answer
    }
    const account = googleAccount(made.life, { relay: 'https://relay.example', place: made.place, ask, now: made.now })
    return { account, waiting, release: () => waiting.splice(0).forEach(resolve => resolve()) }
  }

  it('A5: does not bring a sign-in back when a renewal that Google granted answers after the user disconnected', async () => {
    const made = world()
    await made.connect()
    made.later(61 * 60_000)
    const slow = answersLate(made, '/google/refresh')
    const renewing = slow.account.token(live()).catch((error: unknown) => error)
    await until(() => slow.waiting.length === 1)
    await slow.account.signOut()
    slow.release()
    expect(await renewing).toBeInstanceOf(GoogleEnded)
    expect(made.kept()).toBeNull()
    expect(await slow.account.known()).toBe(false)
  })

  it.each(['granted', 'refused'])(
    'A5: leaves a new sign-in alone when a renewal of the one before it, which Google %s, answers late',
    async outcome => {
      const made = world()
      await made.connect()
      made.later(61 * 60_000)
      if (outcome === 'refused') made.side.forget()
      const slow = answersLate(made, '/google/refresh')
      const renewing = slow.account.token(live()).catch((error: unknown) => error)
      await until(() => slow.waiting.length === 1)
      await slow.account.signOut()
      expect(await slow.account.finish(made.side.consent(await slow.account.begin()), live())).toBe(true)
      const fresh = made.kept()
      slow.release()
      expect(await renewing).toBeInstanceOf(GoogleEnded)
      expect(made.kept()).toBe(fresh)
      expect(await slow.account.known()).toBe(true)
    },
  )

  it('A5: does not bring a sign-in back when its renewed key was still being written as the user disconnected', async () => {
    const made = world()
    await made.connect()
    made.later(61 * 60_000)
    const save = made.place.save
    let release: (() => void) | null = null
    made.place.save = async next => {
      if (next !== null && release === null) await new Promise<void>(resolve => (release = resolve))
      return save(next)
    }
    const renewing = made.account.token(live()).catch((error: unknown) => error)
    await until(() => release !== null)
    const leaving = made.account.signOut()
    await tick()
    release!()
    await leaving
    await renewing
    expect(made.kept()).toBeNull()
    expect(await made.account.known()).toBe(false)
  })

  it('asks the relay once when two calls need a renewed key at the same moment', async () => {
    const { account, connect, side, later } = world()
    await connect()
    later(61 * 60_000)
    const [first, second] = await Promise.all([account.token(live()), account.token(live())])
    expect(first).toEqual(second)
    expect(side.asked.filter(call => call.path === '/google/refresh')).toHaveLength(1)
  })

  it('renews a key Google refused although its time was not up, and gives the key it already has when another call renewed it', async () => {
    const { account, connect, side } = world()
    await connect()
    const old = await account.token(live())
    side.expire()
    const renewed = await account.refused(old, live())
    expect(renewed.value).not.toBe(old.value)
    expect(await account.refused(old, live())).toEqual(renewed)
    expect(side.asked.filter(call => call.path === '/google/refresh')).toHaveLength(1)
  })

  it('keeps the sign-in when the relay says Google could not be reached, and forgets it only when Google ended it', async () => {
    const made = world()
    await made.connect()
    made.later(61 * 60_000)
    made.side.down(true)
    await expect(made.account.token(live())).rejects.not.toBeInstanceOf(GoogleEnded)
    expect(await made.account.known()).toBe(true)
    made.side.down(false)
    expect((await made.account.token(live())).value).toMatch(/^access-/)
  })

  it('drops the sign-in, and tells listeners, when asked to: Google refused even a renewed key', async () => {
    const { account, connect, kept } = world()
    await connect()
    let told = 0
    account.onChange(() => told++)
    await account.drop(await account.token(live()))
    expect(kept()).toBeNull()
    expect(told).toBe(1)
  })

  it('A5: gives no key of a new sign-in to a call that began under the one before it, and drops only the sign-in it is told to', async () => {
    const { account, connect, side, kept } = world()
    await connect()
    const old = await account.token(live())
    await account.signOut()
    expect(await account.finish(side.consent(await account.begin()), live())).toBe(true)
    const fresh = kept()
    await expect(account.refused(old, live())).rejects.toBeInstanceOf(GoogleEnded)
    await account.drop(old)
    expect(kept()).toBe(fresh)
    expect(await account.known()).toBe(true)
  })
})
