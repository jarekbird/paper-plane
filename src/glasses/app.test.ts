import { createStore, Glasses, Lifetime, memoryPlace, SAMPLE_RATE, scriptedSpeech } from 'earshot'
import { fakeBridge } from 'earshot/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoDrafter, demoMessenger } from '../demo/messenger.ts'
import { Inbox } from '../inbox.ts'
import { startGlasses } from './app.ts'

const settle = (ms = 500) => vi.advanceTimersByTimeAsync(ms)
const tone = (ms: number) => new Uint8Array(new Int16Array((ms / 1000) * SAMPLE_RATE).map((_, at) => 8_000 * Math.sin(at / 5)).buffer)

async function world(picks: string[], said: string[] = []) {
  const life = new Lifetime()
  const fake = fakeBridge()
  const messenger = demoMessenger(() => 1_700_000_000_000)
  const inbox = new Inbox(life, messenger, createStore([memoryPlace()]))
  await inbox.start()
  await inbox.pick(picks)
  const app = startGlasses(life, new Glasses(life, fake.bridge), {
    inbox,
    messenger,
    drafter: demoDrafter,
    hearing: { transcribe: scriptedSpeech(said) },
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
  const unread = async (id: string) => (await messenger.chats()).find(chat => chat.id === id)?.unread
  return { ...app, life, fake, messenger, inbox, say, unread }
}

beforeEach(() => void vi.useFakeTimers())
afterEach(() => void vi.useRealTimers())

describe('the list of chats', () => {
  it('shows only the chats the user picked, with how many messages are new', async () => {
    const { fake } = await world(['anna', 'launch'])
    expect(fake.lines()).toEqual(['Paper Plane', '> Anna (2)', 'Launch crew (1)'])
  })

  it('says where to pick chats when none is picked', async () => {
    const { fake } = await world([])
    expect(fake.lines()).toEqual(['Paper Plane', 'Pick your chats on the phone'])
  })

  it('counts a message that arrives in a picked chat', async () => {
    const { fake, messenger } = await world(['sam'])
    messenger.arrive('sam', 'Sam', 'Are you around?')
    await settle()
    expect(fake.lines()).toEqual(['Paper Plane', '> Sam (1)'])
  })

  it('keeps a chat that was not picked off the glasses when a message arrives in it', async () => {
    const { fake, messenger } = await world(['anna'])
    messenger.arrive('sam', 'Sam', 'Are you around?')
    await settle()
    expect(fake.lines()).toEqual(['Paper Plane', '> Anna (2)'])
  })
})

describe('a chat', () => {
  it('shows the newest message first and marks the chat read once it is shown', async () => {
    const { fake, unread } = await world(['anna'])
    fake.tap()
    await settle()
    expect(fake.lines().slice(0, 2)).toEqual(['Anna', 'I can do 12:30 at the usual place.'])
    expect(await unread('anna')).toBe(0)
    fake.double()
    await settle()
    expect(fake.lines()).toEqual(['Paper Plane', '> Anna'])
  })

  it('names who wrote each message in a group', async () => {
    const { fake } = await world(['launch'])
    fake.tap()
    await settle()
    expect(fake.lines()[1]).toBe('Cy: Can someone confirm the demo time for Thursday?')
  })

  it('shows a message that arrives while the chat is open', async () => {
    const { fake, messenger } = await world(['anna'])
    fake.tap()
    await settle()
    messenger.arrive('anna', 'Anna', 'Or one, if that is easier.')
    await settle()
    expect(fake.lines()[1]).toBe('Or one, if that is easier.')
  })
})

describe('a reply', () => {
  it('S5: what is said on a chat is shown first and sent only by a tap', async () => {
    const { fake, messenger, say, router } = await world(['anna'], ['see you at twelve thirty'])
    fake.tap()
    await settle()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'see you at twelve thirty', 'Tap to send'])
    expect(messenger.sent()).toEqual([])
    fake.tap()
    await settle()
    expect(messenger.sent().map(message => [message.chat, message.text])).toEqual([['anna', 'see you at twelve thirty']])
    expect(router.current.id).toBe('chat:anna')
    expect(fake.lines()[1]).toBe('You: see you at twelve thirty')
  })

  it('is dropped by a double tap, and nothing is sent', async () => {
    const { fake, messenger, say, router } = await world(['anna'], ['never mind this'])
    fake.tap()
    await settle()
    await say()
    fake.double()
    await settle()
    expect(router.current.id).toBe('chat:anna')
    expect(messenger.sent()).toEqual([])
  })

  it('is replaced when the user says it again', async () => {
    const { fake, messenger, say, router } = await world(['anna'], ['first try', 'second try'])
    fake.tap()
    await settle()
    await say()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'second try', 'Tap to send'])
    expect(router.depth).toBe(3)
    fake.tap()
    await settle()
    expect(messenger.sent().map(message => message.text)).toEqual(['second try'])
  })

  it('is sent once when the user taps twice', async () => {
    const { fake, messenger, say } = await world(['anna'], ['on my way'])
    fake.tap()
    await settle()
    await say()
    fake.tap()
    fake.tap()
    await settle()
    expect(messenger.sent()).toHaveLength(1)
  })

  it('can be written for the user, who still sends it by a tap', async () => {
    const { fake, messenger } = await world(['anna'])
    fake.tap()
    await settle()
    fake.pick('Draft a reply')
    await settle()
    expect(fake.lines()).toEqual(['To Anna', 'Sounds good, thank you.', 'Tap to send'])
    expect(messenger.sent()).toEqual([])
    fake.tap()
    await settle()
    expect(messenger.sent().map(message => message.text)).toEqual(['Sounds good, thank you.'])
  })

  it('is not started by words said on the list, where no chat is on screen', async () => {
    const { messenger, say, router } = await world(['anna'], ['see you at twelve thirty'])
    await say()
    expect(router.depth).toBe(1)
    expect(messenger.sent()).toEqual([])
  })
})
