import { SAMPLE_RATE, type Question } from 'earshot'
import { describe, expect, it } from 'vitest'
import { hearingThrough } from './hearing.ts'

const RELAY = 'https://relay.example'
const audio = { pcm: new Uint8Array(new Int16Array(SAMPLE_RATE / 2).fill(900).buffer), seconds: 0.5 }
const question: Question = {
  words: 'go back',
  options: [
    { id: 'back', say: 'Go back' },
    { id: 'home', say: 'Go home' },
  ],
}

function relay(answers: Record<string, unknown>) {
  const calls: { url: string; method: string | undefined; headers: unknown; body: Record<string, unknown> }[] = []
  const ask: typeof fetch = async (input, init) => {
    const url = String(input)
    calls.push({ url, method: init?.method, headers: init?.headers, body: JSON.parse(String(init?.body)) })
    return Response.json(answers[new URL(url).pathname] ?? {})
  }
  return { ask, calls }
}

describe('what the app asks of the voice relay', () => {
  it('S1: sends the sound of a hold, and nothing else, to be turned into words', async () => {
    const { ask, calls } = relay({ '/api/v1/audio/transcriptions': { text: ' See you at noon. ' } })
    const words = await hearingThrough(RELAY, ask).transcribe(audio)
    expect(words).toBe('See you at noon.')
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(`${RELAY}/api/v1/audio/transcriptions`)
    expect(Object.keys(calls[0].body).sort()).toEqual(['input_audio', 'language', 'model'])
    expect(calls[0].body.language).toBe('en')
  })

  it('S1: asks what the words meant with the words and the choices, and nothing else', async () => {
    const { ask, calls } = relay({ '/api/alpha/decisions': { answers: { pick: { type: 'choice', probabilities: { back: 0.9 } } } } })
    const chosen = await hearingThrough(RELAY, ask).model.choose(question)
    expect(chosen).toEqual({ back: 0.9 })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(`${RELAY}/api/alpha/decisions`)
    expect(Object.keys(calls[0].body).sort()).toEqual(['model', 'questions', 'state'])
    expect(calls[0].body.state).toBe('The user said: "go back"')
  })

  it('S3: carries no key and no sign-in: the relay holds the key', async () => {
    const { ask, calls } = relay({})
    const hearing = hearingThrough(RELAY, ask)
    await hearing.transcribe(audio)
    await hearing.model.choose(question)
    for (const call of calls) expect(call.headers).toEqual({ 'content-type': 'application/json' })
  })

  it('A2: calls the relay it was given and no other host', async () => {
    const { ask, calls } = relay({})
    const hearing = hearingThrough(`${RELAY}/`, ask)
    await hearing.transcribe(audio)
    await hearing.model.choose(question)
    expect(calls.map(call => new URL(call.url).origin)).toEqual([RELAY, RELAY])
  })

  it('refuses a relay that is not reached over https, so the sound is never sent in the clear', () => {
    expect(() => hearingThrough('http://relay.example')).toThrow()
  })
})
