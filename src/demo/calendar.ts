import type { Calendar, Meeting } from '../messenger.ts'

const HOUR_MS = 3_600_000

export interface DemoCalendar extends Calendar {
  meetings(): readonly Meeting[]
}

export function demoCalendar(now: () => number = Date.now): DemoCalendar {
  let serial = 0
  const hour = Math.ceil(now() / HOUR_MS) * HOUR_MS
  let meetings: Meeting[] = [{ id: 'sample-meeting', title: 'Design review', start: hour + HOUR_MS, end: hour + 2 * HOUR_MS }]
  return {
    next: async (from, signal) => {
      signal.throwIfAborted()
      return [...meetings].sort((a, b) => a.start - b.start).find(meeting => meeting.end > from) ?? null
    },
    add: async (meeting, signal) => {
      signal.throwIfAborted()
      const added = { ...meeting, id: `sample-${++serial}` }
      meetings.push(added)
      return added
    },
    remove: async (meeting, signal) => {
      signal.throwIfAborted()
      meetings = meetings.filter(kept => kept.id !== meeting.id)
    },
    meetings: () => meetings,
  }
}
