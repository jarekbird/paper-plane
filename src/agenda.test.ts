import { Lifetime } from 'earshot'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Agenda, AGENDA_MS } from './agenda.ts'
import { demoCalendar } from './demo/calendar.ts'
import type { Calendar } from './messenger.ts'

const NOW = new Date(2026, 10, 26, 9, 20).getTime()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => void vi.useRealTimers())

function world(wrap: (calendar: Calendar) => Calendar = calendar => calendar) {
  const life = new Lifetime()
  const calendar = demoCalendar(() => NOW)
  const agenda = new Agenda(life, wrap(calendar))
  return { life, calendar, agenda }
}

describe('the next meeting, as the app knows it', () => {
  it('is nothing until the calendar was asked, then the soonest meeting', async () => {
    const { agenda } = world()
    expect(agenda.next()).toBeNull()
    await agenda.refresh()
    expect(agenda.next()?.title).toBe('Design review')
  })

  it('tells listeners when it has asked', async () => {
    const { agenda } = world()
    let told = 0
    agenda.onChange(() => told++)
    await agenda.refresh()
    expect(told).toBe(1)
  })

  it('asks the calendar again every five minutes, so a meeting added elsewhere shows', async () => {
    const { agenda, calendar } = world()
    await agenda.refresh()
    await calendar.add({ title: 'Standup', start: NOW + 600_000, end: NOW + 1_200_000 }, new AbortController().signal)
    await vi.advanceTimersByTimeAsync(AGENDA_MS)
    expect(agenda.next()?.title).toBe('Standup')
  })

  it('stops showing a meeting once it is over, and asks for the one after it', async () => {
    const { agenda, calendar } = world()
    await calendar.add({ title: 'Standup', start: NOW + 60_000, end: NOW + 120_000 }, new AbortController().signal)
    await agenda.refresh()
    expect(agenda.next()?.title).toBe('Standup')
    await vi.advanceTimersByTimeAsync(180_000)
    expect(agenda.next()?.title).toBe('Design review')
  })

  it('has no next meeting, rather than an old one, when the calendar cannot be asked', async () => {
    let fail = false
    const { agenda } = world(calendar => ({
      ...calendar,
      next: async (from, signal) => {
        if (fail) throw new Error('offline')
        return calendar.next(from, signal)
      },
    }))
    await agenda.refresh()
    fail = true
    await agenda.refresh()
    expect(agenda.next()).toBeNull()
  })

  it('A5: keeps the answer to its newest question when an older one comes back last', async () => {
    const answers: (() => void)[] = []
    const { agenda } = world(calendar => ({
      ...calendar,
      next: async () => {
        const turn = answers.length
        await new Promise<void>(resolve => answers.push(resolve))
        return { id: `m${turn}`, title: turn === 0 ? 'Old answer' : 'New answer', start: NOW + 60_000, end: NOW + 120_000 }
      },
    }))
    const first = agenda.refresh()
    const second = agenda.refresh()
    answers[1]()
    await second
    answers[0]()
    await first
    expect(agenda.next()?.title).toBe('New answer')
  })

  it('A4: asks the calendar nothing once the app has ended', async () => {
    let asked = 0
    const { agenda, life } = world(calendar => ({
      ...calendar,
      next: async (from, signal) => {
        asked++
        return calendar.next(from, signal)
      },
    }))
    life.end()
    await agenda.refresh()
    await vi.advanceTimersByTimeAsync(AGENDA_MS * 2)
    expect(asked).toBe(0)
  })
})
