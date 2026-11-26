import { describe, expect, it } from 'vitest'
import { calendarContract } from '../calendar.contract.ts'
import { demoCalendar } from './calendar.ts'

const NOW = new Date(2026, 10, 26, 9, 20).getTime()

calendarContract('the sample calendar', async () => ({ calendar: demoCalendar(() => NOW), now: NOW }))

describe('the sample calendar', () => {
  it('starts with one meeting later today, so the sample account shows a next meeting', async () => {
    const next = await demoCalendar(() => NOW).next(NOW, new AbortController().signal)
    expect(next).toMatchObject({ title: 'Design review', start: new Date(2026, 10, 26, 11, 0).getTime() })
  })
})
