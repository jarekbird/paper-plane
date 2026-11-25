import { ASK, noteOf, oneMessage } from '../instruction.ts'
import type { Writer } from '../messenger.ts'

const QUESTION = /\s+and\s+ask\s+(?=(?:where|what|when|who|why|how|if|whether|which)\b)/i
const sentence = (part: string, asked: boolean) => {
  const text = part
    .replace(asked ? /^(?:if|whether)\s+/i : /^that\s+(?=(?:I|we|he|she|they|it|you)\b)/i, '')
    .trim()
    .replace(/[.?!]+$/, '')
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}${asked ? '?' : '.'}` : ''
}

export function demoWriter(): Writer {
  return {
    write: async (words, signal) => {
      signal.throwIfAborted()
      const note = noteOf(words)
      const [first, ...asked] = note.slice(note.indexOf(': ') + 2).split(QUESTION)
      const written = oneMessage(
        [sentence(first, note.startsWith(ASK)), ...asked.map(part => sentence(part, true))].filter(Boolean).join(' '),
      )
      if (!written) throw new Error('No message came back')
      return written
    },
  }
}
