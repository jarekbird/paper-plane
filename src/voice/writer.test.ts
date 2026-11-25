import { describe, expect, it } from 'vitest'
import { writerContract } from '../writer.contract.ts'
import { WRITER_MODEL, writerThrough } from './writer.ts'

const RELAY = 'https://relay.example'
const live = () => new AbortController().signal

function relay(answer: (body: Record<string, unknown>) => Response | Promise<Response>) {
  const calls: { url: string; headers: unknown; body: Record<string, unknown> }[] = []
  const ask: typeof fetch = async (input, init) => {
    const body = JSON.parse(String(init?.body))
    calls.push({ url: String(input), headers: init?.headers, body })
    return answer(body)
  }
  return { ask, calls }
}
const saying = (content: unknown) => () => Response.json({ choices: [{ message: { content } }] })

writerContract('the writer behind the relay', () => writerThrough(RELAY, relay(saying('Yes! Where should we meet?')).ask))

describe('what the app asks of the relay to write a message', () => {
  it('S1, G5: sends the words that were said and its own fixed instruction, and nothing else', async () => {
    const { ask, calls } = relay(saying('"Yes!\nWhere should we meet?"'))
    expect(await writerThrough(RELAY, ask).write('tell her yes and ask where', live())).toBe('Yes! Where should we meet?')
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(`${RELAY}/api/v1/chat/completions`)
    expect(Object.keys(calls[0].body).sort()).toEqual(['max_tokens', 'messages', 'model'])
    expect(calls[0].body.model).toBe(WRITER_MODEL)
    const messages = calls[0].body.messages as { role: string; content: string }[]
    expect(messages[0].role).toBe('system')
    expect(messages.at(-1)).toEqual({ role: 'user', content: 'Tell them: yes and ask where' })
    const other = writerThrough(RELAY, ask)
    await other.write('say no', live())
    const again = calls[1].body.messages as { role: string; content: string }[]
    expect(again.at(-1)).toEqual({ role: 'user', content: 'Tell them: no' })
    expect(again.slice(0, -1)).toEqual(messages.slice(0, -1))
    const examples = messages.slice(1, -1)
    expect(examples.map(message => message.role)).toEqual(
      Array.from({ length: examples.length }, (_, at) => (at % 2 ? 'assistant' : 'user')),
    )
  })

  it('S3: carries no key', async () => {
    const { ask, calls } = relay(saying('Yes.'))
    await writerThrough(RELAY, ask).write('say yes', live())
    expect(calls[0].headers).toEqual({ 'content-type': 'application/json' })
  })

  it('S4: fails without a word of what was said or answered, whatever went wrong', async () => {
    const failures: (typeof fetch)[] = [
      async () => new Response('Meet Anna at 12:30 {', { status: 200 }),
      async () => new Response('{"error":"Meet Anna"}', { status: 429 }),
      async () => {
        throw new TypeError('Failed to fetch: Meet Anna')
      },
      relay(saying('')).ask,
      relay(saying({ text: 'Meet Anna' })).ask,
      relay(saying('Meet Anna '.repeat(100))).ask,
    ]
    for (const ask of failures) {
      const error: unknown = await writerThrough(RELAY, ask)
        .write('tell her to meet Anna', live())
        .then(
          () => null,
          (thrown: unknown) => thrown,
        )
      expect(error).toBeInstanceOf(Error)
      const failed = error as Error
      expect(failed.cause).toBeUndefined()
      expect(`${failed.message} ${failed.stack}`).not.toMatch(/Meet|Anna|12:30/)
    }
  })

  it('stops asking when the draft is dropped while it waits', async () => {
    const left = new AbortController()
    const never: typeof fetch = (_, init) =>
      new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('gone', 'AbortError'))))
    const waiting = writerThrough(RELAY, never).write('say yes', left.signal)
    left.abort()
    await expect(waiting).rejects.toThrow()
  })

  it('refuses a relay that is not reached over https', () => {
    expect(() => writerThrough('http://relay.example')).toThrow()
  })
})
