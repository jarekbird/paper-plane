const WORD = /[\p{L}\p{N}']+/gu
const PEOPLE = new Set(['her', 'him', 'them', 'everyone', 'everybody'])
const OPENERS = new Set(['that', 'with', 'yes', 'no'])
const TO_PEOPLE = new Set(['tell', 'ask'])
const PLAIN = new Set(['say', 'reply', 'answer', 'respond'])

export const MESSAGE_LIMIT = 600

export function instructed(words: string): boolean {
  const said = [...words.matchAll(WORD)].map(match => match[0].toLowerCase())
  const [first, second, third] = said
  if (TO_PEOPLE.has(first)) return PEOPLE.has(second) && said.length > 2
  if (first === 'let') return PEOPLE.has(second) && third === 'know' && said.length > 3
  if (PLAIN.has(first)) return OPENERS.has(second)
  return false
}

const PERSON = '(?:her|him|them|everyone|everybody)'
export const TELL = 'Tell them: '
export const ASK = 'Ask them: '
const LEADS: [RegExp, string][] = [
  [new RegExp(`^\\s*let\\s+${PERSON}\\s+know\\s+(?:that\\s+)?`, 'i'), TELL],
  [new RegExp(`^\\s*tell\\s+${PERSON}\\s+(?:that\\s+)?`, 'i'), TELL],
  [new RegExp(`^\\s*ask\\s+${PERSON}\\s+`, 'i'), ASK],
  [/^\s*(?:say|reply|answer|respond)\s+(?:(?:that|with)\s+)?/i, TELL],
]
export function noteOf(words: string): string {
  const said = words.replace(/\s+/g, ' ').trim()
  const lead = instructed(said) ? LEADS.find(([found]) => found.test(said)) : undefined
  if (!lead) return `${TELL}${said}`
  return said.replace(lead[0], lead[1])
}

export function oneMessage(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const bare = /^(["“'‘]).*(["”'’])$/.test(flat) ? flat.slice(1, -1).trim() : flat
  const started = `${bare.charAt(0).toUpperCase()}${bare.slice(1)}`
  const whole = /[\p{L}\p{N}]$/u.test(started) ? `${started}.` : started
  return whole.length > MESSAGE_LIMIT ? '' : whole
}
