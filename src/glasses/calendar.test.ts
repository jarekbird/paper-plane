import { createStore, Lifetime, memoryPlace, SAMPLE_RATE, scriptedSpeech, type NavigatorModel, type Question } from 'earshot'
import { fakeBridge } from 'earshot/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Agenda } from '../agenda.ts'
import { demoCalendar } from '../demo/calendar.ts'
import { demoMessenger } from '../demo/messenger.ts'
import { Inbox } from '../inbox.ts'
import type { Calendar } from '../messenger.ts'
import { Phrases } from '../phrases.ts'
import { startGlasses } from './app.ts'
import { display } from './display.ts'

const NOW = new Date(2026, 10, 26, 9, 20).getTime()
const settle = (ms = 500) => vi.advanceTimersByTimeAsync(ms)
const tone = (ms: number) => new Uint8Array(new Int16Array((ms / 1000) * SAMPLE_RATE).map((_, at) => 8_000 * Math.sin(at / 5)).buffer)

interface Options {
  said?: string[]
  calendar?: boolean
  sampleChats?: boolean
  picks?: string[]
  wrap?: (calendar: Calendar) => Calendar
  model?: NavigatorModel
  clock?: () => number
}

async function world(options: Options = {}) {
  const life = new Lifetime()
  const fake = fakeBridge()
  const store = createStore([memoryPlace()])
  const messenger = demoMessenger(() => options.clock?.() ?? NOW)
  const inbox = new Inbox(life, messenger, store)
  await inbox.start()
  await inbox.pick(options.picks ?? ['anna', 'sam'])
  const sample = demoCalendar(() => NOW)
  const calendar = options.calendar === false ? undefined : (options.wrap?.(sample) ?? sample)
  const agenda = calendar ? new Agenda(life, calendar) : undefined
  await agenda?.refresh()
  const gone = { calendar: false }
  const diaryListeners = new Set<() => void>()
  const disconnect = () => {
    gone.calendar = true
    for (const told of [...diaryListeners]) told()
  }
  const app = startGlasses(life, display(life, fake.bridge), {
    inbox,
    messenger,
    phrases: new Phrases(store),
    hearing: { transcribe: scriptedSpeech(options.said ?? []), ...(options.model ? { model: options.model } : {}) },
    ...(options.sampleChats ? { title: 'Sample chats' } : {}),
    diary: () => (calendar && agenda && !gone.calendar ? { calendar, agenda } : null),
    onDiary: told => {
      const stopAgenda = agenda?.onChange(told)
      diaryListeners.add(told)
      return () => {
        stopAgenda?.()
        diaryListeners.delete(told)
      }
    },
  })
  await settle()
  const say = async () => {
    fake.hold()
    await settle(50)
    fake.sound(tone(400))
    fake.sound(tone(400))
    fake.release()
    await settle()
  }
  const tap = async () => {
    fake.tap()
    await settle()
  }
  const menu = () => fake.menuItems().map(item => item.name)
  const sent = () => messenger.sent().map(message => [message.chat, message.text])
  const meetings = () =>
    sample.meetings().map(meeting => [meeting.title, new Date(meeting.start).getHours(), new Date(meeting.start).getMinutes()])
  return { ...app, life, fake, messenger, sample, agenda, say, tap, menu, sent, meetings, disconnect }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => void vi.useRealTimers())

describe('the next meeting, on the list of chats', () => {
  it('is the top line, in place of the app’s name', async () => {
    const { fake } = await world()
    expect(fake.lines()).toEqual(['Next: 11 AM Design review', '> Anna (2)', 'Sam'])
  })

  it('says so when the meeting is running', async () => {
    const { fake } = await world()
    vi.setSystemTime(NOW + 2 * 3_600_000)
    await settle(60_000)
    expect(fake.lines()[0]).toBe('Now: Design review')
  })

  it('names the day when it is not today', async () => {
    const { fake, sample, agenda } = await world()
    await sample.remove(sample.meetings()[0], new AbortController().signal)
    await sample.add({ title: 'Standup', start: NOW + 24 * 3_600_000, end: NOW + 25 * 3_600_000 }, new AbortController().signal)
    await agenda!.refresh()
    await settle()
    expect(fake.lines()[0]).toBe('Next: Tomorrow 9:20 AM Standup')
  })

  it('keeps saying that the chats are samples, whichever calendar the meeting is from', async () => {
    const { fake } = await world({ sampleChats: true })
    expect(fake.lines()[0]).toBe('Sample chats, next 11 AM Design review')
    vi.setSystemTime(NOW + 2 * 3_600_000)
    await settle(60_000)
    expect(fake.lines()[0]).toBe('Sample chats, now Design review')
  })

  it('A8: is not there without a calendar, and the list is as it was', async () => {
    const { fake } = await world({ calendar: false })
    expect(fake.lines()).toEqual(['Paper Plane', '> Anna (2)', 'Sam'])
  })

  it('S1: is never among what a model is offered: a meeting’s name stays on the glasses', async () => {
    const asked: Question[] = []
    const model: NavigatorModel = {
      choose: async question => {
        asked.push(question)
        return {}
      },
    }
    const { say, tap } = await world({ said: ['what is next', 'see you there', 'and now'], model })
    await say()
    await tap()
    await say()
    await say()
    expect(asked.length).toBeGreaterThan(0)
    expect(JSON.stringify(asked)).not.toMatch(/Design review|12:30|Calendar:/)
  })

  it('gives way to trouble with Telegram, which matters more', async () => {
    const { fake, messenger } = await world()
    messenger.trouble({ kind: 'unreachable' })
    await settle()
    expect(fake.lines()[0]).toBe('Cannot reach Telegram')
  })

  it('goes back to the app’s name when the calendar has nothing ahead', async () => {
    const { fake, sample, agenda } = await world()
    await sample.remove(sample.meetings()[0], new AbortController().signal)
    await agenda!.refresh()
    await settle()
    expect(fake.lines()[0]).toBe('Paper Plane')
  })
})

describe('a reply to a message that names a time', () => {
  const DRAFT = ['To Anna', 'See you there', 'Calendar: Today 12:30 to 1:30 PM, Anna', 'Tap to send. Menu: Send and add']

  it('S5: shows the meeting it could add, with its day, both times and its name, under the reply', async () => {
    const { fake, tap, say, menu } = await world({ said: ['See you there'] })
    await tap()
    await say()
    expect(fake.lines()).toEqual(DRAFT)
    expect(menu()).toContain('Send and add')
  })

  it('S5: a tap sends the reply only: nothing lands in the calendar by habit', async () => {
    const { fake, tap, say, sent, meetings } = await world({ said: ['See you there'] })
    await tap()
    await say()
    await tap()
    expect(sent()).toEqual([['anna', 'See you there']])
    expect(meetings()).toEqual([['Design review', 11, 0]])
    expect(fake.lines().at(-1)).toBe('Sent. Tap to undo')
  })

  it('S5: "Send and add" sends the reply and adds exactly the meeting that was on screen', async () => {
    const { fake, tap, say, sent, meetings } = await world({ said: ['See you there'] })
    await tap()
    await say()
    fake.pick('Send and add')
    await settle()
    expect(sent()).toEqual([['anna', 'See you there']])
    expect(meetings()).toEqual([
      ['Design review', 11, 0],
      ['Anna', 12, 30],
    ])
    expect(fake.lines().at(-1)).toBe('Sent and added. Tap to undo')
  })

  it('S5: said aloud, "send and add" asks for a tap first', async () => {
    const { fake, tap, say, sent, meetings } = await world({ said: ['See you there', 'send and add'] })
    await tap()
    await say()
    await say()
    expect(fake.overlay()).toMatch(/Send and add\?\s+Tap to confirm/)
    expect(sent()).toEqual([])
    await tap()
    expect(sent()).toEqual([['anna', 'See you there']])
    expect(meetings()).toHaveLength(2)
  })

  it('takes back both, the message and the meeting, by the one tap on undo', async () => {
    const { fake, tap, say, sent, meetings, messenger } = await world({ said: ['See you there'] })
    await tap()
    await say()
    fake.pick('Send and add')
    await settle()
    await tap()
    expect(fake.overlay()).toBe('Taken back')
    expect(meetings()).toEqual([['Design review', 11, 0]])
    expect((await messenger.history('anna', 10)).map(message => message.text)).not.toContain('See you there')
    expect(sent()).toHaveLength(1)
  })

  it('shows the new meeting as the next one on the list when it is the soonest', async () => {
    const { fake, tap, say } = await world({ said: ['See you there'] })
    await tap()
    await say()
    fake.pick('Send and add')
    await settle()
    fake.double()
    await settle()
    expect(fake.lines()[0]).toBe('Next: 11 AM Design review')
    vi.setSystemTime(NOW + 2.75 * 3_600_000)
    await settle(60_000)
    expect(fake.lines()[0]).toBe('Next: 12:30 PM Anna')
  })

  it('says so, and still offers undo for the message, when the calendar did not take the meeting', async () => {
    const { fake, tap, say, sent, meetings } = await world({
      said: ['See you there'],
      wrap: calendar => ({
        ...calendar,
        add: async () => {
          throw new Error('offline')
        },
      }),
    })
    await tap()
    await say()
    fake.pick('Send and add')
    await settle()
    expect(fake.overlay()).toBe('Sent. Could not add it to the calendar')
    expect(sent()).toEqual([['anna', 'See you there']])
    expect(meetings()).toHaveLength(1)
    await settle(3_000)
    expect(fake.lines().at(-1)).toBe('Sent. Tap to undo')
  })

  it('adds nothing when the message itself could not be sent, and keeps the reply', async () => {
    const { fake, tap, say, messenger, meetings } = await world({ said: ['See you there'] })
    await tap()
    await say()
    messenger.send = async () => {
      throw new Error('offline')
    }
    fake.pick('Send and add')
    await settle()
    expect(meetings()).toHaveLength(1)
    expect(fake.lines().at(-1)).toBe('Not sent. Tap to try again')
  })

  it('A5: offers a meeting only for the chat that is open: not later, from the list, for a message read before', async () => {
    const { fake, tap, say, menu } = await world({ said: ['message anna see you there'] })
    await tap()
    fake.double()
    await settle()
    await say()
    await settle(5_000)
    expect(fake.lines()).toEqual(['To Anna', 'see you there', 'Tap to send'])
    expect(menu()).not.toContain('Send and add')
  })

  it('offers no meeting for a message that names no time', async () => {
    const { fake, say, menu } = await world({ said: ['Any time'], picks: ['sam'] })
    fake.tap()
    await settle()
    await say()
    expect(fake.lines()).toEqual(['To Sam', 'Any time', 'Tap to send'])
    expect(menu()).not.toContain('Send and add')
  })

  it('A8: offers no meeting without a calendar', async () => {
    const { fake, tap, say, menu } = await world({ said: ['See you there'], calendar: false })
    await tap()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'See you there', 'Tap to send'])
    expect(menu()).not.toContain('Send and add')
  })

  it('S5: names the meeting as far as the line shows it, so what is added is what was read', async () => {
    const { fake, say, messenger, meetings } = await world({ said: ['See you there'], picks: ['launch'] })
    messenger.arrive('launch', 'Cy', 'Standup moves to 4pm')
    await settle()
    fake.tap()
    await settle()
    await say()
    const line = fake.lines().at(-2)!
    expect(line).toBe('Calendar: Today 4 to 5 PM, Launch crew')
    fake.pick('Send and add')
    await settle()
    expect(meetings().at(-1)).toEqual(['Launch crew', 16, 0])
  })

  it('counts "tomorrow" from the day the message was sent, not from the day it is answered', async () => {
    let clock = NOW - 24 * 3_600_000
    const { fake, messenger, say } = await world({ said: ['See you there'], picks: ['sam'], clock: () => clock })
    messenger.arrive('sam', 'Sam', 'Tomorrow at noon?')
    clock = NOW
    await settle()
    fake.tap()
    await settle()
    await say()
    expect(fake.lines().at(-2)).toBe('Calendar: Today 12 to 1 PM, Sam')
  })

  it('offers no meeting for a time that has passed since the message was sent', async () => {
    let clock = NOW - 24 * 3_600_000
    const { fake, messenger, say, menu } = await world({ said: ['Sorry I missed it'], picks: ['sam'], clock: () => clock })
    messenger.arrive('sam', 'Sam', 'Call me at 4')
    clock = NOW
    await settle()
    fake.tap()
    await settle()
    await say()
    expect(fake.lines()).toEqual(['To Sam', 'Sorry I missed it', 'Tap to send'])
    expect(menu()).not.toContain('Send and add')
  })

  it('keeps a reply that was waiting for its tap when the calendar is disconnected, and then sends it without a meeting', async () => {
    const { fake, tap, say, menu, sent, meetings, disconnect } = await world({ said: ['See you there'] })
    await tap()
    await say()
    disconnect()
    await settle()
    expect(fake.lines().slice(0, 2)).toEqual(['To Anna', 'See you there'])
    expect(menu()).not.toContain('Send and add')
    await tap()
    expect(sent()).toEqual([['anna', 'See you there']])
    expect(meetings()).toHaveLength(1)
  })

  it('takes the next meeting off the top line when the calendar is disconnected, without leaving the screen', async () => {
    const { fake, tap, disconnect } = await world()
    await tap()
    disconnect()
    await settle()
    expect(fake.lines()[0]).toBe('Anna')
    fake.double()
    await settle()
    expect(fake.lines()[0]).toBe('Paper Plane')
  })

  it('A4: takes no meeting back once the chat was left, though the message is already taken back', async () => {
    let removing = 0
    const { fake, tap, say, life } = await world({
      said: ['See you there'],
      wrap: calendar => ({
        ...calendar,
        remove: async (meeting, signal) => {
          removing++
          signal.throwIfAborted()
          return calendar.remove(meeting, signal)
        },
      }),
    })
    await tap()
    await say()
    fake.pick('Send and add')
    await settle()
    life.end()
    fake.tap()
    await settle()
    expect(removing).toBe(0)
  })
})
