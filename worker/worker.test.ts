import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from './worker.ts'

const env = { OPENROUTER_KEY: 'sk-or-made-up', UPSTREAM: 'https://openrouter.ai' }
const post = (path: string, body: unknown) =>
  new Request(`https://relay.example${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

function upstream(answer: unknown = { text: 'hello' }) {
  const calls: { url: string; key: string | null; body: Record<string, unknown> }[] = []
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), key: new Headers(init?.headers).get('authorization'), body: JSON.parse(String(init?.body)) })
    return Response.json(answer)
  })
  return calls
}

afterEach(() => void vi.unstubAllGlobals())

describe('the Worker', () => {
  it('S3: adds the key on its way to OpenRouter, and the answer does not carry it back', async () => {
    const calls = upstream()
    const response = await worker.fetch(
      post('/api/v1/audio/transcriptions', { model: 'openai/whisper-large-v3-turbo', input_audio: { data: 'AAAA', format: 'wav' } }),
      env,
    )
    expect(response.status).toBe(200)
    expect(calls).toEqual([
      {
        url: 'https://openrouter.ai/api/v1/audio/transcriptions',
        key: 'Bearer sk-or-made-up',
        body: { model: 'openai/whisper-large-v3-turbo', input_audio: { data: 'AAAA', format: 'wav' } },
      },
    ])
    expect(await response.text()).not.toContain('sk-or-made-up')
    expect(JSON.stringify([...response.headers])).not.toContain('sk-or-made-up')
  })

  it('forwards only the fields of a call it knows, so the key cannot be spent on anything else', async () => {
    const calls = upstream()
    await worker.fetch(
      post('/api/v1/chat/completions', { model: 'mistralai/mistral-nemo', messages: [], max_tokens: 5, tools: [{}], stream: true }),
      env,
    )
    expect(calls[0].body).toEqual({ model: 'mistralai/mistral-nemo', messages: [], max_tokens: 5 })
  })

  it('refuses a model it does not list and a call it does not know, without asking OpenRouter', async () => {
    const calls = upstream()
    const costly = await worker.fetch(post('/api/v1/chat/completions', { model: 'openai/gpt-5', messages: [] }), env)
    const other = await worker.fetch(post('/api/v1/credits', { model: 'mistralai/mistral-nemo' }), env)
    expect([costly.status, other.status]).toEqual([400, 404])
    expect(calls).toEqual([])
  })

  it('S7, S4: logs nothing, and has one place to keep anything: the Google sign-in on its way to the phone (worker/pairs.test.ts)', () => {
    const settings = readFileSync(new URL('./wrangler.toml', import.meta.url), 'utf8')
      .split('\n')
      .filter(line => line.trim())
    expect(settings).toEqual([
      'name = "paper-plane-relay"',
      'main = "worker.ts"',
      'compatibility_date = "2026-11-01"',
      'workers_dev = true',
      '[vars]',
      'UPSTREAM = "https://openrouter.ai"',
      '[[durable_objects.bindings]]',
      'name = "PAIRS"',
      'class_name = "PairStore"',
      '[[migrations]]',
      'tag = "v1"',
      'new_sqlite_classes = ["PairStore"]',
    ])
    const code = readFileSync(new URL('./worker.ts', import.meta.url), 'utf8')
    expect(code).not.toMatch(/console|caches|\.put\(|\.get\(|KV|D1|R2|waitUntil/)
  })
})
