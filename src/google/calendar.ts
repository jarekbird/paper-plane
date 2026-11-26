import type { Lifetime } from 'earshot'
import type { Calendar, Meeting } from '../messenger.ts'
import { GoogleEnded, type GoogleAccount } from './account.ts'

const EVENTS = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const LOOK_AHEAD = 10

interface EventLike {
  id?: unknown
  summary?: unknown
  status?: unknown
  start?: { dateTime?: unknown }
  end?: { dateTime?: unknown }
}

function meetingOf(event: EventLike): Meeting | null {
  const start = typeof event.start?.dateTime === 'string' ? Date.parse(event.start.dateTime) : NaN
  const end = typeof event.end?.dateTime === 'string' ? Date.parse(event.end.dateTime) : NaN
  if (typeof event.id !== 'string' || event.status === 'cancelled' || Number.isNaN(start) || Number.isNaN(end)) return null
  return { id: event.id, title: typeof event.summary === 'string' && event.summary.trim() ? event.summary : 'Busy', start, end }
}

export function calendarOver(life: Lifetime, account: GoogleAccount, ask: typeof fetch = fetch): Calendar {
  const call = async (url: string, init: RequestInit, signal: AbortSignal): Promise<Response> => {
    const token = await life.guard(account.token(signal))
    const response = await life.guard(ask(url, { ...init, signal, headers: { ...init.headers, authorization: `Bearer ${token}` } }))
    if (response.status === 401) throw new GoogleEnded()
    return response
  }

  return {
    next: async (from, signal) => {
      const query = new URLSearchParams({
        timeMin: new Date(from).toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: String(LOOK_AHEAD),
        fields: 'items(id,summary,status,start/dateTime,end/dateTime)',
      })
      const response = await life.guard(call(`${EVENTS}?${query}`, { method: 'GET' }, signal))
      if (!response.ok) throw new Error('The calendar did not answer')
      const { items } = (await life.guard(response.json())) as { items?: EventLike[] }
      return (items ?? []).flatMap(event => meetingOf(event) ?? []).find(meeting => meeting.end > from) ?? null
    },
    add: async (meeting, signal) => {
      signal.throwIfAborted()
      const body = {
        summary: meeting.title,
        start: { dateTime: new Date(meeting.start).toISOString() },
        end: { dateTime: new Date(meeting.end).toISOString() },
      }
      const response = await life.guard(
        call(EVENTS, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, signal),
      )
      if (!response.ok) throw new Error('The calendar did not take it')
      const made = (await life.guard(response.json())) as { id?: unknown }
      if (typeof made.id !== 'string') throw new Error('The calendar did not take it')
      return { ...meeting, id: made.id }
    },
    remove: async meeting => {
      const response = await life.guard(call(`${EVENTS}/${encodeURIComponent(meeting.id)}`, { method: 'DELETE' }, life.signal))
      if (!response.ok && response.status !== 404 && response.status !== 410) throw new Error('The calendar did not take it back')
    },
  }
}
