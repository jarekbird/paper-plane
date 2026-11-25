import { createStore, Lifetime, memoryPlace, SAMPLE_RATE, scriptedSpeech, type NavigatorModel, type Question } from 'earshot'
import { fakeBridge } from 'earshot/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoMessenger } from '../demo/messenger.ts'
import { Inbox } from '../inbox.ts'
import type { Writer } from '../messenger.ts'
import { Phrases } from '../phrases.ts'
import { startGlasses } from './app.ts'
import { display } from './display.ts'

const settle = (ms = 500) => vi.advanceTimersByTimeAsync(ms)
const tone = (ms: number) => new Uint8Array(new Int16Array((ms / 1000) * SAMPLE_RATE).map((_, at) => 8_000 * Math.sin(at / 5)).buffer)

interface Asked {
  words: string
  signal: AbortSignal
  answer(text: string): void
  fail(): void
}

function slowWriter() {
  const asked: Asked[] = []
  const writer: Writer = {
    write: (words, signal) =>
      new Promise<string>((resolve, reject) => {
        asked.push({ words, signal, answer: resolve, fail: () => reject(new Error('The voice relay failed')) })
      }),
  }
  return { writer, asked }
}

async function world(said: string[], options: { writer?: Writer; own?: string[]; picks?: string[]; model?: NavigatorModel } = {}) {
  const life = new Lifetime()
  const fake = fakeBridge()
  const store = createStore([memoryPlace()])
  const messenger = demoMessenger(() => 1_700_000_000_000)
  const inbox = new Inbox(life, messenger, store)
  await inbox.start()
  await inbox.pick(options.picks ?? ['anna'])
  const phrases = new Phrases(store)
  for (const phrase of options.own ?? []) await phrases.add(phrase)
  const app = startGlasses(life, display(life, fake.bridge), {
    inbox,
    messenger,
    phrases,
    hearing: { transcribe: scriptedSpeech(said), ...(options.model ? { model: options.model } : {}) },
    ...(options.writer ? { writer: options.writer } : {}),
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
  const open = async () => {
    fake.tap()
    await settle()
  }
  const sent = () => messenger.sent().map(message => [message.chat, message.text])
  const menu = () => fake.menuItems().map(item => item.name)
  return { ...app, fake, messenger, say, open, sent, menu }
}

beforeEach(() => void vi.useFakeTimers())
afterEach(() => void vi.useRealTimers())

describe('say it short: an instruction becomes a message', () => {
  it('S5: shows the words while it is written, then the message, and sends that message only on a tap', async () => {
    const { writer, asked } = slowWriter()
    const { fake, say, open, sent } = await world(['tell her yes and ask where'], { writer })
    await open()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'tell her yes and ask where', 'Writing it out…'])
    asked[0].answer('Yes! Where should we meet?')
    await settle()
    expect(fake.lines()).toEqual(['To Anna', 'Yes! Where should we meet?', 'Tap to send'])
    expect(sent()).toEqual([])
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', 'Yes! Where should we meet?']])
  })

  it('S1, G5: gives the writer the words that were said and nothing of the chat', async () => {
    const { writer, asked } = slowWriter()
    const { say, open } = await world(['tell her yes and ask where'], { writer })
    await open()
    await say()
    expect(asked.map(one => one.words)).toEqual(['tell her yes and ask where'])
  })

  it('S5: sends nothing on a tap while the message is still being written', async () => {
    const { writer, asked } = slowWriter()
    const { fake, say, open, sent, router } = await world(['tell her yes and ask where'], { writer })
    await open()
    await say()
    fake.tap()
    await settle()
    expect(sent()).toEqual([])
    expect(router.current.id).toBe('draft:anna')
    asked[0].answer('Yes! Where should we meet?')
    await settle(2_500)
    expect(sent()).toEqual([])
    expect(fake.lines()).toEqual(['To Anna', 'Yes! Where should we meet?', 'Tap to send'])
  })

  it('S5: does not send a written message the glasses have not drawn yet', async () => {
    const { writer, asked } = slowWriter()
    const { fake, say, open, sent } = await world(['tell her yes and ask where'], { writer })
    await open()
    await say()
    fake.refuse('rebuild', 1)
    asked[0].answer('Yes! Where should we meet?')
    await settle(100)
    expect(fake.lines()[1]).toBe('tell her yes and ask where')
    fake.tap()
    await settle(100)
    expect(sent()).toEqual([])
    await settle(3_000)
    expect(fake.lines()[1]).toBe('Yes! Where should we meet?')
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', 'Yes! Where should we meet?']])
  })

  it('S5: sends the message exactly as the glasses showed it, without characters they cannot show', async () => {
    const { writer, asked } = slowWriter()
    const { fake, say, open, sent } = await world(['tell her yes and ask where'], { writer })
    await open()
    await say()
    asked[0].answer('Yes​! `Where` should we meet?')
    await settle()
    const shown = fake.lines()[1]
    expect(shown).not.toContain('​')
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', shown]])
  })

  it('is dropped by a double tap while it is written: the asking stops and a late answer does nothing', async () => {
    const { writer, asked } = slowWriter()
    const { fake, say, open, sent, router } = await world(['tell her yes and ask where'], { writer })
    await open()
    await say()
    fake.double()
    await settle()
    expect(router.current.id).toBe('chat:anna')
    expect(asked[0].signal.aborted).toBe(true)
    const before = fake.lines()
    asked[0].answer('Yes! Where should we meet?')
    await settle()
    expect(fake.lines()).toEqual(before)
    expect(sent()).toEqual([])
  })

  it('is replaced when the user says something else while it is written; the first answer never shows', async () => {
    const { writer, asked } = slowWriter()
    const { fake, say, open } = await world(['tell her yes and ask where', 'see you at noon'], { writer })
    await open()
    await say()
    await say()
    expect(asked[0].signal.aborted).toBe(true)
    asked[0].answer('Yes! Where should we meet?')
    await settle()
    expect(fake.lines()).toEqual(['To Anna', 'see you at noon', 'Tap to send'])
  })
})

describe('say it short: when the writer does not help', () => {
  it('keeps the words as said, says so, and a tap sends them', async () => {
    const { writer, asked } = slowWriter()
    const { fake, say, open, sent } = await world(['tell her yes and ask where'], { writer })
    await open()
    await say()
    asked[0].fail()
    await settle()
    expect(fake.overlay()).toContain('Could not write it out')
    expect(fake.lines().slice(0, 2)).toEqual(['To Anna', 'tell her yes and ask where'])
    await settle(2_500)
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', 'tell her yes and ask where']])
  })

  it('gives up after twelve seconds without an answer, and stops asking', async () => {
    const { writer, asked } = slowWriter()
    const { fake, say, open } = await world(['tell her yes and ask where'], { writer })
    await open()
    await say()
    await settle(12_000)
    expect(asked[0].signal.aborted).toBe(true)
    expect(fake.overlay()).toContain('Could not write it out')
    await settle(2_500)
    expect(fake.lines()).toEqual(['To Anna', 'tell her yes and ask where', 'Tap to send'])
  })

  it('keeps the words as said when the answer is nothing the glasses can show', async () => {
    const { writer, asked } = slowWriter()
    const { fake, say, open } = await world(['tell her yes and ask where'], { writer })
    await open()
    await say()
    asked[0].answer(' ​ ')
    await settle()
    expect(fake.overlay()).toContain('Could not write it out')
    expect(fake.lines()[1]).toBe('tell her yes and ask where')
  })

  it('A8: without a writer an instruction is a reply like any other, and nothing offers to write it out', async () => {
    const { fake, say, open, menu } = await world(['tell her yes and ask where'])
    await open()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'tell her yes and ask where', 'Tap to send'])
    expect(menu()).not.toContain('Write it out')
  })
})

describe('say it short: the user stays in charge of the words', () => {
  it('puts the words back as they were said, and offers to write them out again', async () => {
    const { writer, asked } = slowWriter()
    const { fake, say, open, sent, menu } = await world(['tell her yes and ask where'], { writer })
    await open()
    await say()
    asked[0].answer('Yes! Where should we meet?')
    await settle()
    expect(menu()).toContain('As I said it')
    expect(menu()).not.toContain('Write it out')
    fake.pick('As I said it')
    await settle()
    expect(fake.lines()).toEqual(['To Anna', 'tell her yes and ask where', 'Tap to send'])
    expect(menu()).toContain('Write it out')
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', 'tell her yes and ask where']])
  })

  it('leaves a plain reply as said, and writes it out only when asked to', async () => {
    const { writer, asked } = slowWriter()
    const { fake, say, open } = await world(['see you at noon'], { writer })
    await open()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'see you at noon', 'Tap to send'])
    expect(asked).toEqual([])
    fake.pick('Write it out')
    await settle()
    expect(fake.lines()[2]).toBe('Writing it out…')
    asked[0].answer('See you at noon!')
    await settle()
    expect(fake.lines()).toEqual(['To Anna', 'See you at noon!', 'Tap to send'])
  })

  it('never rewrites one of the user’s own phrases, even one that reads like an instruction', async () => {
    const phrase = 'Tell her I am in a meeting until three and will call right after it ends, thanks'
    const { writer, asked } = slowWriter()
    const { fake, open } = await world([], { writer, own: [phrase] })
    await open()
    fake.tap()
    await settle()
    fake.down()
    fake.down()
    fake.down()
    await settle()
    fake.tap()
    await settle()
    expect(fake.lines()[0]).toBe('To Anna')
    expect(fake.lines().slice(1, -1).join(' ')).toBe(phrase)
    expect(fake.lines().at(-1)).toBe('Tap to send')
    expect(asked).toEqual([])
  })

  it('writes out the rest of "message Sam …" when that rest is an instruction', async () => {
    const { writer, asked } = slowWriter()
    const { fake, say } = await world(['message Sam tell him I am running late'], { writer, picks: ['anna', 'sam'] })
    await say()
    expect(asked.map(one => one.words)).toEqual(['tell him I am running late'])
    asked[0].answer('I am running late.')
    await settle(2_500)
    expect(fake.lines()).toEqual(['To Sam', 'I am running late.', 'Tap to send'])
  })

  it('S1: asks no model what an instruction means when a chat is open: it is the reply', async () => {
    const questions: Question[] = []
    const model: NavigatorModel = {
      choose: async question => {
        questions.push(question)
        return {}
      },
    }
    const { writer, asked } = slowWriter()
    const { say, open } = await world(['ask her if Thursday still works'], { writer, model })
    await open()
    await say()
    expect(questions).toEqual([])
    expect(asked.map(one => one.words)).toEqual(['ask her if Thursday still works'])
  })
})
