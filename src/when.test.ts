import { describe, expect, it } from 'vitest'
import { spanWords, whenIn, whenWords } from './when.ts'

const THURSDAY_9 = new Date(2026, 10, 26, 9, 0).getTime()
const at = (text: string, now = THURSDAY_9) => {
  const found = whenIn(text, now)
  return found ? whenWords(found.start, now) : null
}

describe('a time named in a message', () => {
  it.each([
    ['I can do 12:30 at the usual place.', 'Today 12:30 PM'],
    ['Lunch at noon?', 'Today 12 PM'],
    ['Call me at 4', 'Today 4 PM'],
    ['See you at 10', 'Today 10 AM'],
    ['Demo is at 4pm', 'Today 4 PM'],
    ['Standup 9:15 am tomorrow', 'Tomorrow 9:15 AM'],
    ['Tomorrow at 3 works', 'Tomorrow 3 PM'],
    ['tonight 8pm?', 'Today 8 PM'],
    ['The review moved to 16:00', 'Today 4 PM'],
    ['Dinner Saturday 7:30', 'Sat 7:30 PM'],
    ['Can we meet Monday at 11?', 'Mon 11 AM'],
    ['Flight on Dec 3 at 6:45 am', 'Thu 3 Dec 6:45 AM'],
    ['3rd of December, 2 pm', 'Thu 3 Dec 2 PM'],
    ['12.30 works', 'Today 12:30 PM'],
  ])('reads "%s" as %s', (text, words) => {
    expect(at(text)).toBe(words)
  })

  it.each([
    ['Thanks for yesterday.'],
    ['Build is green.'],
    ['Can you confirm the demo time for Thursday?'],
    ['It costs 12 dollars'],
    ['Room 204'],
    ['Call 555 0100'],
    ['Version 2.75 is out'],
    ['At 25 we were young'],
    ['31 Feb at 9'],
  ])('finds no time to offer in "%s"', text => {
    expect(at(text)).toBeNull()
  })

  it('means tomorrow when the hour has passed today and no day was named', () => {
    expect(at('Breakfast at 8')).toBe('Tomorrow 8 AM')
  })

  it('means next week when the weekday named is today and the hour has passed', () => {
    expect(at('Thursday 8 am')).toBe('Thu 3 Dec 8 AM')
  })

  it('offers nothing for a day that was named and is already over', () => {
    expect(at('today at 8 am')).toBeNull()
  })

  it('means next year for a date that has passed this year', () => {
    const found = whenIn('Jan 5 at 10', THURSDAY_9)!
    expect(new Date(found.start).getFullYear()).toBe(2027)
  })

  it('lasts an hour, and keeps the words it was read from', () => {
    const found = whenIn('I can do 12:30 at the usual place.', THURSDAY_9)!
    expect(found.end - found.start).toBe(3_600_000)
    expect(found.words).toBe('12:30')
  })
})

describe('a meeting’s two times, in words', () => {
  const span = (from: [number, number], to: [number, number], day = 26) =>
    spanWords(new Date(2026, 10, day, ...from).getTime(), new Date(2026, 10, day, ...to).getTime(), THURSDAY_9)

  it.each([
    [[12, 30], [13, 30], 'Today 12:30 to 1:30 PM'],
    [[16, 0], [17, 0], 'Today 4 to 5 PM'],
    [[11, 30], [12, 30], 'Today 11:30 AM to 12:30 PM'],
    [[9, 15], [10, 15], 'Today 9:15 to 10:15 AM'],
  ] as [[number, number], [number, number], string][])('says %j to %j as "%s"', (from, to, words) => {
    expect(span(from, to)).toBe(words)
  })

  it('names another day once', () => {
    expect(span([16, 0], [17, 0], 27)).toBe('Tomorrow 4 to 5 PM')
  })
})
