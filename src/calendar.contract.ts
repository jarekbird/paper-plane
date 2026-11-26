import { describe, expect, it } from 'vitest'
import type { Calendar } from './messenger.ts'

export interface CalendarWorld {
  calendar: Calendar
  now: number
}

const HOUR_MS = 3_600_000
const live = () => new AbortController().signal

export function calendarContract(name: string, make: () => Promise<CalendarWorld>): void {
  describe(`A6: ${name} keeps the calendar contract`, () => {
    it('adds a meeting with the title and the times it was given, and has it as the next one when nothing is sooner', async () => {
      const { calendar, now } = await make()
      const soon = { title: 'Lunch with Anna', start: now + 60_000, end: now + 60_000 + HOUR_MS }
      const added = await calendar.add(soon, live())
      expect(added).toMatchObject(soon)
      expect(added.id.length).toBeGreaterThan(0)
      expect(await calendar.next(now, live())).toEqual(added)
    })

    it('gives the soonest meeting that is not over yet, also one that has started', async () => {
      const { calendar, now } = await make()
      const later = await calendar.add({ title: 'Later', start: now + 30 * 60_000, end: now + 40 * 60_000 }, live())
      const running = await calendar.add({ title: 'Running', start: now - 10 * 60_000, end: now + 10 * 60_000 }, live())
      await calendar.add({ title: 'Over', start: now - 2 * HOUR_MS, end: now - HOUR_MS }, live())
      expect(await calendar.next(now, live())).toEqual(running)
      expect(await calendar.next(now + 20 * 60_000, live())).toEqual(later)
    })

    it('takes a meeting back, and does not mind being asked twice', async () => {
      const { calendar, now } = await make()
      const before = await calendar.next(now, live())
      const added = await calendar.add({ title: 'By mistake', start: now + 60_000, end: now + 120_000 }, live())
      await calendar.remove(added, live())
      await calendar.remove(added, live())
      expect(await calendar.next(now, live())).toEqual(before)
    })

    it('A4: adds nothing for a caller that has already gone', async () => {
      const { calendar, now } = await make()
      const before = await calendar.next(now, live())
      const gone = new AbortController()
      gone.abort()
      await expect(calendar.add({ title: 'Too late', start: now + 60_000, end: now + 120_000 }, gone.signal)).rejects.toThrow()
      expect(await calendar.next(now, live())).toEqual(before)
    })

    it('A4: takes nothing back for a caller that has already gone', async () => {
      const { calendar, now } = await make()
      const added = await calendar.add({ title: 'Stays', start: now + 60_000, end: now + 120_000 }, live())
      const gone = new AbortController()
      gone.abort()
      await expect(calendar.remove(added, gone.signal)).rejects.toThrow()
      expect(await calendar.next(now, live())).toEqual(added)
    })
  })
}
