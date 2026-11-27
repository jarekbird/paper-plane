import { createStore, Lifetime, memoryPlace, SAMPLE_RATE, scriptedSpeech, type NavigatorModel, type Question } from 'earshot'
import { fakeBridge } from 'earshot/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoMessenger } from '../demo/messenger.ts'
import { Inbox } from '../inbox.ts'
import { Phrases } from '../phrases.ts'
import { startGlasses } from './app.ts'
import { display } from './display.ts'

const settle = (ms = 500) => vi.advanceTimersByTimeAsync(ms)
const tone = (ms: number) => new Uint8Array(new Int16Array((ms / 1000) * SAMPLE_RATE).map((_, at) => 8_000 * Math.sin(at / 5)).buffer)

type Chances = Record<string, number>

async function world(said: string[], chances: Chances) {
  const life = new Lifetime()
  const fake = fakeBridge()
  const store = createStore([memoryPlace()])
  const messenger = demoMessenger(() => 1_700_000_000_000)
  const inbox = new Inbox(life, messenger, store)
  await inbox.start()
  await inbox.pick(['anna', 'sam'])
  const asked: Question[] = []
  const model: NavigatorModel = {
    choose: async question => {
      asked.push(question)
      return Object.fromEntries(
        question.options.flatMap(option =>
          chances[option.role ?? option.say] === undefined ? [] : [[option.id, chances[option.role ?? option.say]]],
        ),
      )
    },
  }
  const app = startGlasses(life, display(life, fake.bridge), {
    inbox,
    messenger,
    phrases: new Phrases(store),
    hearing: { transcribe: scriptedSpeech(said), model },
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
  return { ...app, fake, say, open, sent, asked }
}

beforeEach(() => void vi.useFakeTimers())
afterEach(() => void vi.useRealTimers())

describe('in a chat, what is said is the reply unless the navigator is sure of a command', () => {
  it('is the reply when the navigator leans toward a command without being sure (measured: "let us go back to the old plan")', async () => {
    const { fake, say, open, router } = await world(['let us go back to the old plan'], {
      'Go back': 0.38,
      none: 0.22,
      pass: 0.19,
      'Scroll up': 0.16,
    })
    await open()
    await say()
    expect(router.current.id).toBe('draft:anna')
    expect(fake.lines()).toEqual(['To Anna', 'let us go back to the old plan', 'Tap to send'])
  })

  it('is the reply when the navigator finds nothing that fits (measured: "please mark that as done")', async () => {
    const { fake, say, open } = await world(['please mark that as done'], { none: 0.83, 'Mark all read: the chats on the list': 0.08 })
    await open()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'please mark that as done', 'Tap to send'])
  })

  it('never asks "Which one?" between commands: two half-likely commands are still the reply', async () => {
    const { say, open, router } = await world(['save me a seat'], {
      'Save: the top message from someone else': 0.4,
      'Reply (show the list)': 0.3,
      pass: 0.2,
    })
    await open()
    await say()
    expect(router.current.id).toBe('draft:anna')
  })

  it('runs the command the navigator is sure of', async () => {
    const { fake, say, open, router } = await world(['like that'], { 'Like: the top message from someone else': 0.74, pass: 0.09 })
    await open()
    await say()
    expect(router.current.id).toBe('chat:anna')
    expect(fake.overlay()).toContain('Tap to confirm')
  })

  it('runs a command the navigator is fairly sure of, at the chance measured for "go home" (0.68)', async () => {
    const { say, open, router } = await world(['go home'], { 'Go home': 0.68, pass: 0.15 })
    await open()
    await say()
    expect(router.current.id).toBe('chats')
  })

  it('stays the reply just under that bar (measured: "keep the change" on a reply, Send 0.54)', async () => {
    const { fake, say, open, sent } = await world(['keep the change'], { 'Reply (show the list)': 0.54, pass: 0.28 })
    await open()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'keep the change', 'Tap to send'])
    expect(sent()).toEqual([])
  })

  it('likes or saves on "like" and "save that", where the navigator is sure, and still only after a tap', async () => {
    const { fake, say, open, router } = await world(['like', 'save that'], {
      'Like: the top message from someone else': 0.98,
      'Save: the top message from someone else': 0.0,
    })
    await open()
    await say()
    expect(fake.overlay()).toMatch(/^Like: the top message from someone else\?\s+Tap to confirm/)
    expect(router.current.id).toBe('chat:anna')
  })

  it('takes "like that idea" for a reply, not for a like (measured: Like 0.29)', async () => {
    const { fake, say, open } = await world(['like that idea a lot'], { 'Like: the top message from someone else': 0.29, pass: 0.5 })
    await open()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'like that idea a lot', 'Tap to send'])
  })

  it('goes back when the navigator is sure of that', async () => {
    const { say, open, router } = await world(['back to the list'], { 'Go back': 0.9, 'Scroll up': 0.08 })
    await open()
    await say()
    expect(router.current.id).toBe('chats')
  })

  it('S5: never turns a sentence into a short answer that only means the same (measured: "yes that works for me")', async () => {
    const { fake, say, open, sent } = await world(['yes that works for me'], { 'Reply: OK': 0.88, pass: 0.08 })
    await open()
    await say()
    expect(fake.overlay()).not.toContain('Tap to confirm')
    expect(fake.lines()).toEqual(['To Anna', 'yes that works for me', 'Tap to send'])
    expect(sent()).toEqual([])
  })

  it('runs a command said by its very name, however speech-to-text wrote it, without asking the navigator (measured on speech: "Go home!" became a reply)', async () => {
    const { say, open, router, asked } = await world(['Go home!'], {})
    await open()
    await say()
    expect(asked).toEqual([])
    expect(router.current.id).toBe('chats')
  })

  it('S5: takes "Send." on a reply for the command, and still sends only after a tap', async () => {
    const { fake, say, open, asked, sent } = await world(['see you soon', 'Send.'], { pass: 1 })
    await open()
    await say()
    await settle(6_000)
    await say()
    expect(asked).toHaveLength(1)
    expect(fake.overlay()).toMatch(/Send\?\s+Tap to confirm/)
    expect(sent()).toEqual([])
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', 'see you soon']])
  })

  it('offers a short answer when its very words are said, without asking the navigator', async () => {
    const { fake, say, open, asked, sent } = await world(['Thanks!', 'reply on my way'], {})
    await open()
    await say()
    expect(asked).toEqual([])
    expect(fake.overlay()).toMatch(/Reply: Thanks\?\s+Tap to confirm/)
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', 'Thanks']])
    await settle(6_000)
    await say()
    expect(asked).toEqual([])
    expect(fake.overlay()).toMatch(/Reply: On my way\?\s+Tap to confirm/)
  })

  it('tells the navigator, in a chat, that the other choice is a message to a person', async () => {
    const { say, open, asked } = await world(['what is new', 'what is new'], {})
    await say()
    await open()
    await say()
    const passOf = (question: Question) => question.options.find(option => option.role === 'pass')?.say
    expect(passOf(asked[0])).toMatch(/name of a chat/)
    expect(passOf(asked[1])).toMatch(/^A message to send to the person in the chat on screen/)
  })
})

describe('on a reply not sent yet, the same rule', () => {
  it('replaces the reply with what is said when the navigator is not sure it is a command (measured: "send me the address when you can")', async () => {
    const { fake, say, sent } = await world(['message Sam see you at noon', 'send me the address when you can'], { Send: 0.47, pass: 0.43 })
    await say()
    await settle(2_500)
    expect(fake.lines()).toEqual(['To Sam', 'see you at noon', 'Tap to send'])
    await say()
    expect(fake.overlay()).not.toContain('Tap to confirm')
    await settle(2_500)
    expect(fake.lines()).toEqual(['To Sam', 'send me the address when you can', 'Tap to send'])
    expect(sent()).toEqual([])
  })

  it('S5: asks for a tap when the navigator is sure the word was "send"', async () => {
    const { fake, say, sent } = await world(['message Sam see you at noon', 'send it'], { Send: 0.97, pass: 0.03 })
    await say()
    await settle(2_500)
    await say()
    expect(sent()).toEqual([])
    expect(fake.overlay()).toMatch(/Send\?\s+Tap to confirm/)
  })
})

describe('on the list of chats, where no reply can be meant', () => {
  it('still asks which command was meant when the navigator is between two', async () => {
    const { fake, say } = await world(['next one'], { 'Move down': 0.51, 'Open chat': 0.16, 'Choose this one': 0.12 })
    await say()
    expect(fake.lines()[0]).toBe('Which one?')
  })
})
