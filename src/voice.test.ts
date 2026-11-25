import { createStore, Lifetime, memoryPlace, SAMPLE_RATE } from 'earshot'
import { fakeBridge } from 'earshot/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startApp } from './app.ts'
import { DEMO_PICKS, demoMessenger } from './demo/messenger.ts'
import { display } from './glasses/display.ts'
import { hearingThrough } from './voice/hearing.ts'

const RELAY = 'https://relay.example'
const settle = (ms = 500) => vi.advanceTimersByTimeAsync(ms)
const tone = (ms: number) => new Uint8Array(new Int16Array((ms / 1000) * SAMPLE_RATE).map((_, at) => 8_000 * Math.sin(at / 5)).buffer)

async function world(heard: string) {
  const life = new Lifetime()
  const fake = fakeBridge()
  const sent: { path: string; body: string }[] = []
  const ask: typeof fetch = async (input, init) => {
    const { pathname } = new URL(String(input))
    const body = JSON.parse(String(init?.body))
    delete body.input_audio
    sent.push({ path: pathname, body: JSON.stringify(body).toLowerCase() })
    return Response.json(
      pathname === '/api/v1/audio/transcriptions' ? { text: heard } : { answers: { pick: { type: 'choice', probabilities: {} } } },
    )
  }
  await startApp({
    life,
    display: display(life, fake.bridge),
    store: createStore([memoryPlace()]),
    sample: { messenger: demoMessenger(() => 1_700_000_000_000), picks: DEMO_PICKS },
    hearing: hearingThrough(RELAY, ask),
  })
  await settle()
  const say = async () => {
    fake.hold()
    await settle(50)
    fake.sound(tone(400))
    fake.sound(tone(400))
    fake.release()
    await settle()
  }
  return { fake, sent, say }
}

beforeEach(() => void vi.useFakeTimers())
afterEach(() => void vi.useRealTimers())

describe('what leaves the phone when the user holds and speaks', () => {
  it('S1, G5: is the sound and the words heard; no chat, person or message of the account, on the list or in a chat', async () => {
    const { fake, sent, say } = await world('what is new')
    await say()
    fake.tap()
    await settle()
    expect(fake.lines().join(' ')).toContain('12:30')
    await say()
    expect(sent.map(call => call.path)).toEqual([
      '/api/v1/audio/transcriptions',
      '/api/alpha/decisions',
      '/api/v1/audio/transcriptions',
      '/api/alpha/decisions',
    ])
    const questions = sent.filter(call => call.path === '/api/alpha/decisions')
    for (const { body } of questions) {
      expect(body).toContain('what is new')
      for (const kept of ['anna', 'launch', 'crew', 'glasses news', 'sam', '12:30', 'usual place', 'lunch', 'demo'])
        expect(body).not.toMatch(new RegExp(`\\b${kept}\\b`))
    }
  })

  it('S1: asks no model at all when the words name a chat: the name is matched on the phone', async () => {
    const { fake, sent, say } = await world('open launch crew')
    await say()
    expect(sent.map(call => call.path)).toEqual(['/api/v1/audio/transcriptions'])
    expect(fake.lines().join(' ')).toContain('demo time')
  })
})
