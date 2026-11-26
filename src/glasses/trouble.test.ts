import { createStore, Lifetime, memoryPlace, SAMPLE_RATE, scriptedSpeech } from 'earshot'
import { fakeBridge } from 'earshot/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoMessenger } from '../demo/messenger.ts'
import { demoWriter } from '../demo/writer.ts'
import { Inbox } from '../inbox.ts'
import { TroubleError, type Trouble } from '../messenger.ts'
import { Phrases } from '../phrases.ts'
import { startGlasses } from './app.ts'
import { display } from './display.ts'

const settle = (ms = 500) => vi.advanceTimersByTimeAsync(ms)
const tone = (ms: number) => new Uint8Array(new Int16Array((ms / 1000) * SAMPLE_RATE).map((_, at) => 8_000 * Math.sin(at / 5)).buffer)
const UNREACHABLE: Trouble = { kind: 'unreachable' }
const WAIT: Trouble = { kind: 'wait', seconds: 90 }
const HOME = ['Paper Plane', '> Anna (2)', 'Launch crew (1)']
const ANNA = [
  'Anna',
  'I can do 12:30 at the usual place.',
  'Nice. Are we still on for lunch first?',
  'You: Running the demo at four.',
  'Tap to reply',
]

async function world(said: string[] = [], writes = false) {
  const life = new Lifetime()
  const fake = fakeBridge()
  const store = createStore([memoryPlace()])
  const messenger = demoMessenger(() => 1_700_000_000_000)
  const inbox = new Inbox(life, messenger, store)
  await inbox.start()
  await inbox.pick(['anna', 'launch'])
  const app = startGlasses(life, display(life, fake.bridge), {
    inbox,
    messenger,
    phrases: new Phrases(store),
    hearing: { transcribe: scriptedSpeech(said) },
    ...(writes ? { writer: demoWriter() } : {}),
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
  const tap = async () => {
    fake.tap()
    await settle()
  }
  const sent = () => messenger.sent().map(message => [message.chat, message.text])
  return { ...app, life, fake, messenger, say, tap, sent }
}

beforeEach(() => void vi.useFakeTimers())
afterEach(() => void vi.useRealTimers())

describe('the list of chats, when Telegram is in trouble', () => {
  it('says above the chats that Telegram cannot be reached, keeps them listed, and says so no longer once it can', async () => {
    const { fake, messenger } = await world()
    expect(fake.lines()).toEqual(HOME)
    messenger.trouble(UNREACHABLE)
    await settle()
    expect(fake.lines()).toEqual(['Cannot reach Telegram', ...HOME.slice(1)])
    messenger.trouble(null)
    await settle()
    expect(fake.lines()).toEqual(HOME)
  })

  it('says how long Telegram asks to wait', async () => {
    const { fake, messenger } = await world()
    messenger.trouble(WAIT)
    await settle()
    expect(fake.lines()[0]).toBe('Telegram says wait 2 minutes')
  })
})

describe('a chat, when Telegram is in trouble', () => {
  it('says that Telegram cannot be reached in place of messages it can no longer vouch for, and shows them again by itself', async () => {
    const { fake, messenger, tap } = await world()
    await tap()
    expect(fake.lines()).toEqual(ANNA)
    messenger.trouble(UNREACHABLE)
    await settle()
    expect(fake.lines()).toEqual(['Anna', 'Cannot reach Telegram', 'Tap to try again'])
    messenger.trouble(null)
    await settle()
    expect(fake.lines()).toEqual(ANNA)
  })

  it('offers to try again, by a tap, when it could not load, and offers no reply to messages it does not show', async () => {
    const { fake, messenger, tap } = await world()
    const history = messenger.history
    messenger.history = async () => {
      throw new TroubleError(UNREACHABLE)
    }
    await tap()
    expect(fake.lines()).toEqual(['Anna', 'Cannot reach Telegram', 'Tap to try again'])
    expect(fake.menuItems().map(item => item.name)).not.toContain('Reply')
    messenger.history = history
    await tap()
    expect(fake.lines()).toEqual(ANNA)
  })

  it('A7: tries again when the user says so, as by a tap', async () => {
    const { fake, messenger, tap, say } = await world(['try again'])
    const history = messenger.history
    messenger.history = async () => {
      throw new Error('anything')
    }
    await tap()
    expect(fake.lines()).toEqual(['Anna', 'Could not load this chat', 'Tap to try again'])
    messenger.history = history
    await say()
    await settle(5_000)
    expect(fake.lines()).toEqual(ANNA)
  })

  it('says why a like did not go through', async () => {
    const { fake, messenger, tap, life } = await world()
    await tap()
    messenger.like = async () => {
      throw new TroubleError(UNREACHABLE)
    }
    fake.pick('Like')
    await settle()
    expect(fake.overlay()).toBe('Cannot reach Telegram')
    life.end()
  })
})

describe('marking all read, when Telegram is in trouble', () => {
  const failing = async (said: string[] = []) => {
    const made = await world(said)
    made.messenger.read = async () => {
      throw new TroubleError(UNREACHABLE)
    }
    return made
  }

  it('says why it did not work when it is chosen from the menu', async () => {
    const { fake } = await failing()
    fake.pick('Mark all read')
    await settle()
    expect(fake.overlay()).toBe('Cannot reach Telegram')
  })

  it('A7: says the same when it is said and confirmed by a tap', async () => {
    const { fake, say, tap } = await failing(['mark all read'])
    await say()
    expect(fake.overlay()).toContain('Tap to confirm')
    await tap()
    expect(fake.overlay()).toBe('Cannot reach Telegram')
  })
})

describe('a reply, when Telegram is in trouble', () => {
  it('S5: is not sent while Telegram cannot be reached, says why, stays on screen, and goes out once by a tap when it can', async () => {
    const { fake, messenger, tap, say, sent } = await world(['See you at noon'])
    await tap()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'See you at noon', 'Tap to send'])
    const send = messenger.send
    messenger.send = async () => {
      throw new TroubleError(UNREACHABLE)
    }
    await tap()
    expect(fake.overlay()).toBe('Cannot reach Telegram')
    await settle(5_000)
    expect(fake.overlay()).toBe('')
    expect(fake.lines()).toEqual(['To Anna', 'See you at noon', 'Not sent. Tap to try again'])
    expect(sent()).toEqual([])
    messenger.send = send
    await tap()
    expect(sent()).toEqual([['anna', 'See you at noon']])
  })

  it('says how long Telegram asks to wait, and keeps the reply', async () => {
    const { fake, messenger, tap, say, sent } = await world(['See you at noon'])
    await tap()
    await say()
    messenger.send = async () => {
      throw new TroubleError(WAIT)
    }
    await tap()
    expect(fake.overlay()).toBe('Telegram says wait 2 minutes')
    await settle(5_000)
    expect(fake.lines()).toEqual(['To Anna', 'See you at noon', 'Not sent. Tap to try again'])
    expect(sent()).toEqual([])
  })

  it('says only that it was not sent for a failure that is no trouble of Telegram’s', async () => {
    const { fake, messenger, tap, say } = await world(['See you at noon'])
    await tap()
    await say()
    messenger.send = async () => {
      throw new Error('anything')
    }
    await tap()
    expect(fake.overlay()).toBe('')
    expect(fake.lines()).toEqual(['To Anna', 'See you at noon', 'Not sent. Tap to try again'])
  })

  it('S5: arrives once when Telegram took it, the answer was lost, and the user taps to try again', async () => {
    const { fake, messenger, tap, say, sent } = await world(['See you at noon'])
    await tap()
    await say()
    messenger.loseAnswer()
    await tap()
    expect(fake.overlay()).toBe('Cannot reach Telegram')
    await settle(5_000)
    expect(fake.lines()).toEqual(['To Anna', 'See you at noon', 'Not sent. Tap to try again'])
    await tap()
    expect(fake.overlay()).toBe('Sent')
    await settle(5_000)
    expect(fake.lines()).toEqual([
      'Anna',
      'You: See you at noon',
      'I can do 12:30 at the usual place.',
      'Nice. Are we still on for lunch first?',
      'You: Running the demo at four.',
      'Tap to reply',
    ])
    expect(sent()).toEqual([['anna', 'See you at noon']])
  })

  it('S5: a short answer arrives once too, when its answer was lost and the user picks it again', async () => {
    const { fake, messenger, tap, sent } = await world()
    await tap()
    await tap()
    messenger.loseAnswer()
    await tap()
    expect(fake.overlay()).toBe('Cannot reach Telegram')
    await settle(5_000)
    await tap()
    expect(fake.overlay()).toBe('Sent')
    await settle(5_000)
    expect(fake.lines().at(-1)).toBe('Tap to reply')
    expect(sent()).toHaveLength(1)
  })

  it('S5: sends other words as a new message, never as the one whose answer was lost', async () => {
    const { fake, messenger, tap, say, sent } = await world(['tell her see you at noon'], true)
    await tap()
    await say()
    await settle(1_000)
    const written = fake.lines()[1]
    messenger.loseAnswer()
    await tap()
    await settle(5_000)
    fake.pick('As I said it')
    await settle()
    expect(fake.lines()[1]).toBe('tell her see you at noon')
    await tap()
    expect(sent()).toEqual([
      ['anna', written],
      ['anna', 'tell her see you at noon'],
    ])
  })
})
