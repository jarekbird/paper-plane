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

  it('says the sign-in has ended when Google refuses the key, so the app can hide the calendar', async () => {
    const { calendar, side } = await world()
    side.expire()
    await expect(calendar.next(NOW, live())).rejects.toBeInstanceOf(GoogleEnded)
  })

  it('A2: asks only Google’s calendar for the calendar', async () => {
    const { calendar, side } = await world()
    const added = await calendar.add({ title: 'Anna', start: NOW + 600_000, end: NOW + 4_200_000 }, live())
    await calendar.next(NOW, live())
    await calendar.remove(added)
    expect([...new Set(side.asked.map(call => call.host))]).toEqual(['www.googleapis.com'])
  })

  it('A4: asks Google nothing once the app has ended', async () => {
    const { calendar, side, life } = await world()
    life.end()
    await expect(calendar.next(NOW, live())).rejects.toThrow()
    expect(side.asked).toEqual([])
  })
})
