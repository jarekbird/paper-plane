import { ASK, noteOf, oneMessage, TELL } from '../instruction.ts'
import type { Writer } from '../messenger.ts'

const PART = new RegExp(`(?:^|\\. )(${TELL}|${ASK})`)
const sentence = (part: string, asked: boolean) => {
  const text = (asked ? part.replace(/^(?:if|whether)\s+/i, '') : part).trim().replace(/[.?!]+$/, '')
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}${asked ? '?' : '.'}` : ''
}

export function demoWriter(): Writer {
  return {
    write: async (words, signal) => {
      signal.throwIfAborted()
      const parts = noteOf(words).split(PART)
      const sentences: string[] = []
      for (let at = 1; at < parts.length; at += 2) sentences.push(sentence(parts[at + 1], parts[at] === ASK))
      const written = oneMessage(sentences.filter(Boolean).join(' '))
      if (!written) throw new Error('No message came back')
      return written
    },
  }
}
