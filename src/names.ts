export interface Named {
  id: string
  title: string
}

export interface Found<T extends Named> {
  matches: T[]
  rest: string
}

interface Token {
  text: string
  end: number
}

const WORD = /[\p{L}\p{N}]+/gu
const LEAD = /^[\s,:;.-]*(?:(?:saying|that|to say)\b)?[\s,:;.-]*/i
const FUZZY_FROM = 5
const FIRST_NAME_FROM = 3

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

function runEnd(said: readonly Token[], wanted: readonly string[]): number | null {
  for (let start = 0; start + wanted.length <= said.length; start++) {
    if (wanted.every((word, at) => same(said[start + at].text, word))) return said[start + wanted.length - 1].end
  }
  return null
}

export function findNamed<T extends Named>(words: string, named: readonly T[]): Found<T> {
  const said = tokensOf(words)
  let best = 0
  let found: { item: T; end: number }[] = []
  for (const item of named) {
    const title = tokensOf(item.title).map(token => token.text)
    if (title.length === 0) continue
    const whole = runEnd(said, title)
    const first = whole === null && title.length > 1 && title[0].length >= FIRST_NAME_FROM ? runEnd(said, [title[0]]) : null
    const end = whole ?? first
    if (end === null) continue
    const score = whole === null ? 1 : title.length + 1
    if (score > best) [best, found] = [score, []]
    if (score === best) found.push({ item, end })
  }
  const rest = found.length === 1 ? words.slice(found[0].end).replace(LEAD, '').trim() : ''
  return { matches: found.map(entry => entry.item), rest }
}
