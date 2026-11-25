import { noteOf, oneMessage } from '../instruction.ts'
import type { Writer } from '../messenger.ts'

export const WRITER_MODEL = 'mistralai/mistral-nemo'
const MAX_TOKENS = 200
// With the examples below this wording gave a faithful message 69 times of 72 with mistralai/mistral-nemo on 2026-11-25 (docs/proof/say-it-short/live.md).
const SYSTEM =
  'You turn a spoken note into the text message to send. The note says what to tell or ask "them": "them" is the person who will read the message, so write to them as "you" and never mention "them" or the telling. Write as the sender, in the first person, the way people type on a phone: one or two short, natural sentences with normal capital letters and punctuation. Keep every point of the note and add nothing: no fact, name, time or place that is not in it, no greeting, no sign-off, no emoji. A thing to ask becomes a question. Answer with the message only, without quotes.'
const EXAMPLES = [
  ['Tell them: sure. Ask them: when', 'Sure. When?'],
  ['Tell them: the meeting is cancelled', 'The meeting is cancelled.'],
  ['Ask them: if they can pick me up', 'Can you pick me up?'],
  ['Ask them: if Friday is still fine', 'Is Friday still fine?'],
  ['Tell them: the door is open. Tell them: to come in', 'The door is open. Come in.'],
  ['Tell them: thanks, I owe you one', 'Thanks, I owe you one.'],
].flatMap(([note, message]) => [
  { role: 'user', content: note },
  { role: 'assistant', content: message },
])

export function writerThrough(relay: string, ask: typeof fetch = fetch): Writer {
  const base = new URL(relay)
  if (base.protocol !== 'https:') throw new Error('The voice relay must be an https address')
  const url = `${base.origin}/api/v1/chat/completions`
  const answerOf = async (words: string, signal: AbortSignal): Promise<unknown> => {
    const response = await ask(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: WRITER_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'system', content: SYSTEM }, ...EXAMPLES, { role: 'user', content: noteOf(words) }],
      }),
      signal,
    })
    return response.ok ? response.json() : response.status
  }
  return {
    write: async (words, signal) => {
      signal.throwIfAborted()
      const answer = await answerOf(words, signal).catch(() => null)
      signal.throwIfAborted()
      if (typeof answer === 'number') throw new Error(`The voice relay answered ${answer}`)
      const content = (answer as { choices?: { message?: { content?: unknown } }[] } | null)?.choices?.[0]?.message?.content
      const written = typeof content === 'string' ? oneMessage(content) : ''
      if (!written) throw new Error('No message came back')
      return written
    },
  }
}
