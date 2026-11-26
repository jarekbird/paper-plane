export interface When {
  start: number
  end: number
  words: string
}

const HOUR_MS = 3_600_000
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*'
const DAY = new RegExp(
  `\\b(?:(today|tonight|tomorrow)|(${DAYS.join('|')})|(\\d{1,2})(?:st|nd|rd|th)?(?: of)? ${MONTH}|${MONTH} (\\d{1,2})(?:st|nd|rd|th)?)\\b`,
  'i',
)
const TIME = /\b(?:(\d{1,2})[:.](\d{2})\s*(am|pm)?|(\d{1,2})\s*(am|pm)|at (\d{1,2})(?![\d:.])|(noon|midnight))\b/i

interface Clock {
  hour: number
  minute: number
  words: string
}

function clockIn(text: string): Clock | null {
  const found = TIME.exec(text)
  if (!found) return null
  const [, colonHour, colonMinute, colonHalf, plainHour, plainHalf, atHour, named] = found
  const words = found[0].trim()
  if (named) return { hour: named.toLowerCase() === 'noon' ? 12 : 0, minute: 0, words }
  const said = Number(colonHour ?? plainHour ?? atHour)
  const minute = Number(colonMinute ?? 0)
  const half = (colonHalf ?? plainHalf)?.toLowerCase()
  if (minute > 59 || said > 23 || (half && (said < 1 || said > 12))) return null
  const hour = half ? (said % 12) + (half === 'pm' ? 12 : 0) : said >= 1 && said <= 7 ? said + 12 : said
  return { hour, minute, words }
}

function dayIn(text: string, now: Date): { date: Date; words: string } | 'none' | null {
  const found = DAY.exec(text)
  if (!found) return 'none'
  const [words, near, weekday, dayFirst, monthAfter, monthFirst, dayAfter] = found
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (near) {
    if (near.toLowerCase() === 'tomorrow') date.setDate(date.getDate() + 1)
    return { date, words }
  }
  if (weekday) {
    date.setDate(date.getDate() + ((DAYS.indexOf(weekday.toLowerCase()) - date.getDay() + 7) % 7))
    return { date, words }
  }
  const month = MONTHS.indexOf((monthAfter ?? monthFirst).toLowerCase())
  const day = Number(dayFirst ?? dayAfter)
  const named = new Date(now.getFullYear(), month, day)
  if (named.getMonth() !== month || day < 1) return null
  if (named.getTime() < date.getTime()) named.setFullYear(named.getFullYear() + 1)
  return { date: named, words }
}

export function whenIn(text: string, at: number): When | null {
  const now = new Date(at)
  const clock = clockIn(text)
  const named = dayIn(text, now)
  if (!clock || !named) return null
  const day = named === 'none' ? null : named
  const start = day ? new Date(day.date) : new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setHours(clock.hour, clock.minute, 0, 0)
  if (start.getTime() <= at) {
    if (day && !/^(?:sun|mon|tue|wed|thu|fri|sat)/i.test(day.words)) return null
    start.setDate(start.getDate() + (day ? 7 : 1))
  }
  return { start: start.getTime(), end: start.getTime() + HOUR_MS, words: day ? `${day.words} ${clock.words}` : clock.words }
}

const clockWords = (date: Date) => {
  const hour = date.getHours()
  const minute = date.getMinutes()
  return `${hour % 12 === 0 ? 12 : hour % 12}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${hour < 12 ? 'AM' : 'PM'}`
}

export function spanWords(start: number, end: number, at: number): string {
  const from = clockWords(new Date(start))
  const to = clockWords(new Date(end))
  const sameHalf = from.slice(-2) === to.slice(-2)
  return `${whenWords(start, at).slice(0, -from.length)}${sameHalf ? from.slice(0, -3) : from} to ${to}`
}

export function whenWords(start: number, at: number): string {
  const date = new Date(start)
  const now = new Date(at)
  const days = Math.round(
    (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
      new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      (24 * HOUR_MS),
  )
  const day =
    days === 0
      ? 'Today'
      : days === 1
        ? 'Tomorrow'
        : days > 1 && days < 7
          ? SHORT_DAYS[date.getDay()]
          : `${SHORT_DAYS[date.getDay()]} ${date.getDate()} ${SHORT_MONTHS[date.getMonth()]}`
  return `${day} ${clockWords(date)}`
}
