import { oneMessage } from '../instruction.ts'
import type { Writer } from '../messenger.ts'

const LEAD =
  /^\s*(?:(?:tell|ask)\s+(?:her|him|them|everyone|everybody)|let\s+(?:her|him|them|everyone|everybody)\s+know|say|reply|answer|respond)\s+(?:(?:that|with)\s+)?/i
const NEXT = /\s+and\s+(ask|tell|say)(?:\s+(?:her|him|them|everyone|everybody))?\s+/i
const sentence = (part: string, asked: boolean) => {
  const text = (asked ? part.replace(/^(?:if|whether)\s+/i, '') : part).trim().replace(/[.?!]+$/, '')
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}${asked ? '?' : '.'}` : ''
}

export function demoWriter(): Writer {
  return {
    write: async (words, signal) => {
      signal.throwIfAborted()
      const parts = words.replace(LEAD, '').split(NEXT)
      const sentences = [sentence(parts[0], /^\s*ask\b/i.test(words))]
      for (let at = 1; at < parts.length; at += 2) sentences.push(sentence(parts[at + 1], parts[at].toLowerCase() === 'ask'))
      const written = oneMessage(sentences.filter(Boolean).join(' '))
      if (!written) throw new Error('No message came back')
      return written
    },
  }
}
