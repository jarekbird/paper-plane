export interface Named {
  id: string
  title: string
}

export interface Found<T extends Named> {
  matches: T[]
  rest: string
  at: number | null
}

export type Command = 'open' | 'message'

interface Token {
  text: string
  end: number
}

const WORD = /[\p{L}\p{N}]+/gu
const LEAD = /^\s*[:,]?\s*/
const FUZZY_FROM = 5
const FIRST_NAME_FROM = 3
const BEFORE_A_CHAT = new Set(['the', 'my', 'me', 'up', 'chat', 'conversation', 'with'])

const tokensOf = (text: string): Token[] =>
  [...text.matchAll(WORD)].map(match => ({ text: match[0].toLowerCase(), end: match.index + match[0].length }))

function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2
  let row = Array.from({ length: b.length + 1 }, (_, at) => at)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) next.push(Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)))
    row = next
  }
  return row[b.length]
}

const same = (said: string, wanted: string) =>
  said === wanted || (said.length >= FUZZY_FROM && wanted.length >= FUZZY_FROM && distance(said, wanted) <= 1)

interface Run {
  start: number
  length: number
  end: number
}

function firstRun(said: readonly Token[], wanted: readonly string[]): Run | null {
  for (let start = 0; start + wanted.length <= said.length; start++) {
    if (wanted.every((word, at) => same(said[start + at].text, word))) {
      return { start, length: wanted.length, end: said[start + wanted.length - 1].end }
    }
  }
  return null
}

const sooner = (a: Run, b: Run) => a.start - b.start || b.length - a.length

export function findNamed<T extends Named>(words: string, named: readonly T[]): Found<T> {
  const said = tokensOf(words)
  const found: { item: T; run: Run }[] = []
  for (const item of named) {
    const title = tokensOf(item.title).map(token => token.text)
    if (title.length === 0) continue
    const whole = firstRun(said, title)
    const first = title.length > 1 && title[0].length >= FIRST_NAME_FROM && !BEFORE_A_CHAT.has(title[0]) ? firstRun(said, [title[0]]) : null
    const run = [whole, first].filter(candidate => candidate !== null).sort(sooner)[0]
    if (run) found.push({ item, run })
  }
  found.sort((a, b) => sooner(a.run, b.run))
  const meant = found.filter(entry => sooner(entry.run, found[0].run) === 0)
  const rest = meant.length === 1 ? words.slice(meant[0].run.end).replace(LEAD, '').trim() : ''
  return { matches: meant.map(entry => entry.item), rest, at: meant.length ? meant[0].run.start : null }
}

const VERBS = new Map<string, Command>([
  ['message', 'message'],
  ['tell', 'message'],
  ['text', 'message'],
  ['open', 'open'],
  ['show', 'open'],
])

const NOBODY = { matches: [], rest: '', at: null }

export function addressed<T extends Named>(words: string, named: readonly T[]): Found<T> {
  const tokens = tokensOf(words)
  const said = tokens.map(token => token.text)
  const verbAt = said.findIndex(word => VERBS.has(word))
  if (verbAt < 0) return NOBODY
  const opening = VERBS.get(said[verbAt]) === 'open'
  const from = verbAt + (!opening && said[verbAt + 1] === 'to' ? 2 : 1)
  const found = findNamed(words, named)
  if (found.at === from) return found
  for (let at = from; opening && BEFORE_A_CHAT.has(said[at]); at++) {
    const after = findNamed(words.slice(tokens[at].end), named)
    if (after.at === 0) return { ...after, at: at + 1 }
  }
  return NOBODY
}

export function commandOf(words: string): Command | null {
  return VERBS.get(tokensOf(words)[0]?.text ?? '') ?? null
}

export function sameWords(a: string, b: string): boolean {
  const words = (text: string) =>
    tokensOf(text)
      .map(token => token.text)
      .join(' ')
  return words(a) === words(b)
}
