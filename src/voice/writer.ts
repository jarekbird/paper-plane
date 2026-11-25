import { oneMessage } from '../instruction.ts'
import type { Writer } from '../messenger.ts'

export const WRITER_MODEL = 'mistralai/mistral-nemo'
const MAX_TOKENS = 200
const SYSTEM =
  'The user is wearing smart glasses and says, in a few words, what to answer someone in a chat. Write the text message they want to send, in the first person, the way they would type it: short, natural, plain text, one paragraph. Use only what they said: add no fact, name, time or place, and no greeting or sign-off they did not ask for. Answer with the message only.'

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
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: words },
        ],
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
