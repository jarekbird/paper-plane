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

export function oneMessage(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const bare = /^(["“'‘]).*(["”'’])$/.test(flat) ? flat.slice(1, -1).trim() : flat
  return bare.length > MESSAGE_LIMIT ? '' : bare
}
