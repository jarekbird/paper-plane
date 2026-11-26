import { Lifetime } from 'earshot'
import { describe, expect, it } from 'vitest'
import { calendarContract } from '../calendar.contract.ts'
import { GoogleEnded, googleAccount, type GooglePlace } from './account.ts'
import { calendarOver } from './calendar.ts'
import { googleSide } from './testing.ts'

const NOW = Date.parse('2026-11-26T16:20:00Z')
const live = () => new AbortController().signal

async function world() {
  const side = googleSide()
  let kept: string | null = null
  const place: GooglePlace = { load: async () => kept, save: async next => void (kept = next) }
  const life = new Lifetime()
  const account = googleAccount(life, { relay: 'https://relay.example', place, ask: side.ask, now: () => NOW })
  await account.finish(side.consent(await account.begin()), live())
  side.asked.length = 0
  return { side, account, life, calendar: calendarOver(life, account, side.ask) }
}

calendarContract('Google Calendar, over a stand-in for Google', async () => ({ calendar: (await world()).calendar, now: NOW }))

describe('Google Calendar', () => {
  it('S1: sends Google the title and the two times of a meeting the user confirmed, and nothing else', async () => {
    const { calendar, side } = await world()
    await calendar.add({ title: 'Anna', start: NOW + 600_000, end: NOW + 4_200_000 }, live())
    expect(side.asked).toEqual([
      {
        host: 'www.googleapis.com',
        path: '/calendar/v3/calendars/primary/events',
        method: 'POST',
        body: { summary: 'Anna', start: { dateTime: '2026-11-26T16:30:00.000Z' }, end: { dateTime: '2026-11-26T17:30:00.000Z' } },
        bearer: 'Bearer access-2',
      },
    ])
  })

  it('passes by an all-day entry and a cancelled one, and calls a meeting with no title "Busy"', async () => {
    const { calendar, side } = await world()
    side.put({ id: 'day', summary: 'Holiday', start: { date: '2026-11-26' }, end: { date: '2026-11-28' } })
    side.put({
      id: 'off',
      summary: 'Dropped',
      status: 'cancelled',
      start: { dateTime: '2026-11-26T16:30:00Z' },
      end: { dateTime: '2026-11-26T17:00:00Z' },
    })
    side.put({ id: 'plain', start: { dateTime: '2026-11-26T18:00:00Z' }, end: { dateTime: '2026-11-26T18:30:00Z' } })
    expect(await calendar.next(NOW, live())).toEqual({
      id: 'plain',
      title: 'Busy',
      start: Date.parse('2026-11-26T18:00:00Z'),
      end: Date.parse('2026-11-26T18:30:00Z'),
    })
  })

  it('has no next meeting when the calendar has none', async () => {
    expect(await (await world()).calendar.next(NOW, live())).toBeNull()
  })

  it('renews its key and asks again when Google refuses the key it has, so one stale key costs the user nothing', async () => {
    const { calendar, side, account } = await world()
    side.put({ id: 'plain', summary: 'Standup', start: { dateTime: '2026-11-26T18:00:00Z' }, end: { dateTime: '2026-11-26T18:30:00Z' } })
    side.expire()
    expect((await calendar.next(NOW, live()))?.title).toBe('Standup')
    expect(await account.known()).toBe(true)
  })

  it('A8: forgets the sign-in and tells its listeners when Google has ended it, so the app takes the calendar off the glasses', async () => {
    const { calendar, side, account } = await world()
    let told = 0
    account.onChange(() => told++)
    side.end()
    await expect(calendar.next(NOW, live())).rejects.toBeInstanceOf(GoogleEnded)
    expect(await account.known()).toBe(false)
    expect(told).toBe(1)
  })

  it('finds the next meeting with a time behind any number of all-day entries, reading on page by page', async () => {
    const { calendar, side } = await world()
    for (let day = 0; day < 120; day++)
      side.put({ id: `day-${day}`, summary: 'Holiday', start: { date: '2026-11-26' }, end: { date: '2026-11-28' } })
    side.put({ id: 'timed', summary: 'Standup', start: { dateTime: '2026-11-26T18:00:00Z' }, end: { dateTime: '2026-11-26T18:30:00Z' } })
    expect((await calendar.next(NOW, live()))?.title).toBe('Standup')
    expect(side.asked.filter(call => call.method === 'GET').length).toBe(3)
  })

  it('stops reading pages at some point, and then has no next meeting, rather than reading a whole calendar', async () => {
    const { calendar, side } = await world()
    for (let day = 0; day < 400; day++)
      side.put({ id: `day-${day}`, summary: 'Holiday', start: { date: '2026-11-26' }, end: { date: '2026-11-28' } })
    expect(await calendar.next(NOW, live())).toBeNull()
    expect(side.asked.filter(call => call.method === 'GET').length).toBe(5)
  })

  it('A2: asks only Google’s calendar for the calendar', async () => {
    const { calendar, side } = await world()
    const added = await calendar.add({ title: 'Anna', start: NOW + 600_000, end: NOW + 4_200_000 }, live())
    await calendar.next(NOW, live())
    await calendar.remove(added, live())
    expect([...new Set(side.asked.map(call => call.host))]).toEqual(['www.googleapis.com'])
  })

  it('A4: asks Google nothing once the app has ended', async () => {
    const { calendar, side, life } = await world()
    life.end()
    await expect(calendar.next(NOW, live())).rejects.toThrow()
    expect(side.asked).toEqual([])
  })

  const replaced = async (hold: 'the first answer' | 'the answer to the second try') => {
    const side = googleSide()
    let kept: string | null = null
    const place: GooglePlace = { load: async () => kept, save: async next => void (kept = next) }
    const life = new Lifetime()
    const waiting: (() => void)[] = []
    const deletes: (string | null)[] = []
    const ask: typeof fetch = async (input, init) => {
      if (init?.method !== 'DELETE') return side.ask(input, init)
      deletes.push(new Headers(init.headers).get('authorization'))
      if ((hold === 'the first answer') === (deletes.length === 1)) await new Promise<void>(resolve => waiting.push(resolve))
      return new Response('{}', { status: 401 })
    }
    const account = googleAccount(life, { relay: 'https://relay.example', place, ask: side.ask, now: () => NOW })
    await account.finish(side.consent(await account.begin()), live())
    const calendar = calendarOver(life, account, ask)
    const removing = calendar.remove({ id: 'theirs', title: 'x', start: NOW, end: NOW + 1 }, live()).catch((error: unknown) => error)
    for (let turn = 0; turn < 200 && waiting.length === 0; turn++) await new Promise(resolve => setTimeout(resolve, 0))
    await account.signOut()
    await account.finish(side.consent(await account.begin()), live())
    const fresh = kept
    const theirs = `Bearer ${(JSON.parse(kept!) as { access: string }).access}`
    waiting.splice(0).forEach(resolve => resolve())
    return { outcome: await removing, deletes, theirs, same: () => kept === fresh, account }
  }

  it.each(['the first answer', 'the answer to the second try'] as const)(
    'A5: when the user connects another Google account while %s is on its way, asks nothing with the new account’s key and leaves its sign-in alone',
    async hold => {
      const { outcome, deletes, theirs, same, account } = await replaced(hold)
      expect(outcome).toBeInstanceOf(GoogleEnded)
      expect(deletes).not.toContain(theirs)
      expect(same()).toBe(true)
      expect(await account.known()).toBe(true)
    },
  )

  it('A4: asks Google to take nothing back for a caller that left while the key was being fetched', async () => {
    const { calendar, side, account } = await world()
    const added = await calendar.add({ title: 'Anna', start: NOW + 600_000, end: NOW + 4_200_000 }, live())
    const token = account.token
    let release = () => {}
    account.token = async signal => {
      await new Promise<void>(resolve => (release = resolve))
      return token(signal)
    }
    const caller = new AbortController()
    const removing = calendar.remove(added, caller.signal).catch(() => 'left')
    await new Promise(resolve => setTimeout(resolve, 0))
    caller.abort()
    release()
    expect(await removing).toBe('left')
    expect(side.asked.filter(call => call.method === 'DELETE')).toEqual([])
  })
})
