import { createStore, Glasses, Lifetime, memoryPlace, SAMPLE_RATE, scriptedSpeech } from 'earshot'
import { fakeBridge } from 'earshot/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoMessenger } from '../demo/messenger.ts'
import { Inbox } from '../inbox.ts'
import { Phrases } from '../phrases.ts'
import { startGlasses } from './app.ts'

const settle = (ms = 500) => vi.advanceTimersByTimeAsync(ms)
const tone = (ms: number) => new Uint8Array(new Int16Array((ms / 1000) * SAMPLE_RATE).map((_, at) => 8_000 * Math.sin(at / 5)).buffer)

async function world(picks: string[], said: string[] = [], own: string[] = []) {
  const life = new Lifetime()
  const fake = fakeBridge()
  const store = createStore([memoryPlace()])
  const messenger = demoMessenger(() => 1_700_000_000_000)
  const inbox = new Inbox(life, messenger, store)
  await inbox.start()
  await inbox.pick(picks)
  const phrases = new Phrases(store)
  for (const phrase of own) await phrases.add(phrase)
  const gate: { wait: Promise<void> | null } = { wait: null }
  const send = messenger.send
  messenger.send = async (chat, text) => {
    await gate.wait
    return send(chat, text)
  }
  const app = startGlasses(life, new Glasses(life, fake.bridge), {
    inbox,
    messenger,
    phrases,
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
  const openFirst = async () => {
    fake.tap()
    await settle()
  }
  const unread = async (id: string) => (await messenger.chats()).find(chat => chat.id === id)?.unread
  const texts = async (id: string) => (await messenger.history(id, 10)).map(message => message.text)
  const sent = () => messenger.sent().map(message => [message.chat, message.text])
  return { ...app, life, fake, messenger, inbox, phrases, say, openFirst, unread, texts, sent, gate }
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
  it('shows the newest message first, says how to answer, and marks the chat read once it is shown', async () => {
    const { fake, unread, openFirst } = await world(['anna'])
    await openFirst()
    expect(fake.lines().slice(0, 2)).toEqual(['Anna', 'I can do 12:30 at the usual place.'])
    expect(fake.lines().at(-1)).toBe('Tap to reply')
    expect(await unread('anna')).toBe(0)
    fake.double()
    await settle()
    expect(fake.lines()).toEqual(['Paper Plane', '> Anna'])
  })

  it('names who wrote each message in a group', async () => {
    const { fake, openFirst } = await world(['launch'])
    await openFirst()
    expect(fake.lines()[1]).toBe('Cy: Can someone confirm the demo time for Thursday?')
  })

  it('shows a message that arrives while the chat is open', async () => {
    const { fake, messenger, openFirst } = await world(['anna'])
    await openFirst()
    messenger.arrive('anna', 'Anna', 'Or one, if that is easier.')
    await settle()
    expect(fake.lines()[1]).toBe('Or one, if that is easier.')
  })

  it('scrolls a long chat by swipes, and both ways back', async () => {
    const { fake, messenger, openFirst } = await world(['sam'])
    for (let n = 1; n <= 6; n++) messenger.arrive('sam', 'Sam', `Message number ${n}, long enough to fill a row or two on the display.`)
    await settle()
    await openFirst()
    const first = fake.lines()[1]
    fake.down()
    await settle()
    expect(fake.lines()[1]).not.toBe(first)
    fake.up()
    await settle()
    expect(fake.lines()[1]).toBe(first)
  })
})

describe('a reply said aloud', () => {
  it('S5: is shown first and sent only by a tap', async () => {
    const { fake, say, router, sent, openFirst } = await world(['anna'], ['see you at twelve thirty'])
    await openFirst()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'see you at twelve thirty', 'Tap to send'])
    expect(sent()).toEqual([])
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', 'see you at twelve thirty']])
    expect(router.current.id).toBe('chat:anna')
    expect(fake.lines()[1]).toBe('You: see you at twelve thirty')
  })

  it('S5: is sent exactly as it was shown, without characters the glasses cannot show', async () => {
    const { fake, say, sent, openFirst } = await world(['anna'], ['pay alice\u200b five `hundred`'])
    await openFirst()
    await say()
    const shown = fake.lines()[1]
    expect(shown).not.toContain('\u200b')
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', shown]])
  })

  it('is dropped by a double tap, and nothing is sent', async () => {
    const { fake, say, router, sent, openFirst } = await world(['anna'], ['never mind this'])
    await openFirst()
    await say()
    fake.double()
    await settle()
    expect(router.current.id).toBe('chat:anna')
    expect(sent()).toEqual([])
  })

  it('is replaced when the user says it again', async () => {
    const { fake, say, router, sent, openFirst } = await world(['anna'], ['first try', 'second try'])
    await openFirst()
    await say()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'second try', 'Tap to send'])
    expect(router.depth).toBe(3)
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', 'second try']])
  })

  it('is sent once when the user taps twice', async () => {
    const { fake, say, sent, openFirst } = await world(['anna'], ['on my way'])
    await openFirst()
    await say()
    fake.tap()
    fake.tap()
    await settle()
    expect(sent()).toHaveLength(1)
  })

  it('takes the place of the short answers when the user speaks instead of choosing one', async () => {
    const { fake, say, router, openFirst } = await world(['anna'], ['tomorrow would be better'])
    await openFirst()
    fake.tap()
    await settle()
    await say()
    expect(fake.lines()).toEqual(['To Anna', 'tomorrow would be better', 'Tap to send'])
    expect(router.depth).toBe(3)
  })

  it('is not started by words said on the list, where no chat is on screen', async () => {
    const { say, router, sent } = await world(['anna'], ['see you at twelve thirty'])
    await say()
    expect(router.depth).toBe(1)
    expect(sent()).toEqual([])
  })
})

describe('a short answer', () => {
  it('is offered by a tap on the chat: three that fit the newest message, under where they go', async () => {
    const { fake, messenger, openFirst } = await world(['anna'])
    messenger.arrive('anna', 'Anna', 'Does one work instead?')
    await settle()
    await openFirst()
    fake.tap()
    await settle()
    expect(fake.lines()).toEqual(['To Anna', '> Yes', 'No', 'Let me check'])
  })

  it('S5: is sent, exactly as its row reads, by the tap on that row', async () => {
    const { fake, messenger, sent, router, openFirst } = await world(['anna'])
    messenger.arrive('anna', 'Anna', 'Does one work instead?')
    await settle()
    await openFirst()
    fake.tap()
    await settle()
    expect(sent()).toEqual([])
    fake.down()
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', 'No']])
    expect(router.current.id).toBe('chat:anna')
  })

  it('lists the user’s own phrases after the fixed answers', async () => {
    const { fake, openFirst } = await world(['anna'], [], ['In a meeting, back at three'])
    await openFirst()
    fake.tap()
    await settle()
    expect(fake.lines()).toEqual(['To Anna', '> OK', 'Thanks', 'On my way', 'In a meeting, back at three'])
  })

  it('S5: chosen by voice, asks for a tap before it is sent', async () => {
    const { fake, say, sent, openFirst } = await world(['anna'], ['reply thanks'])
    await openFirst()
    await say()
    expect(sent()).toEqual([])
    expect(fake.overlay()).toContain('Tap to confirm')
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', 'Thanks']])
  })

  it('S1: keeps the user’s own phrases out of what a model is offered', async () => {
    const { router, openFirst } = await world(['anna'], [], ['In a meeting, back at three'])
    await openFirst()
    const reply = router.actions().find(candidate => candidate.id === 'reply')
    expect(reply?.targets()?.map(target => [target.say, target.private])).toEqual([
      ['OK', false],
      ['Thanks', false],
      ['On my way', false],
      ['In a meeting, back at three', true],
    ])
  })
})

describe('a short answer too long for its row', () => {
  const LONG = 'I can help with the launch and will be there for the rehearsal, but cannot attend the actual event on Thursday.'

  it('S5: is shown in full before it can be sent, since its row is cut', async () => {
    const { fake, sent, openFirst } = await world(['anna'], [], [LONG])
    await openFirst()
    fake.tap()
    await settle()
    fake.down()
    fake.down()
    fake.down()
    await settle()
    expect(fake.lines().at(-1)).not.toBe(LONG)
    fake.tap()
    await settle()
    expect(sent()).toEqual([])
    expect(fake.lines()[0]).toBe('To Anna')
    expect(fake.lines().slice(1, -1).join(' ')).toBe(LONG)
    expect(fake.lines().at(-1)).toBe('Tap to send')
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', LONG]])
  })
})

describe('a send that takes a while', () => {
  const slow = (w: Awaited<ReturnType<typeof world>>) => {
    let release = () => {}
    w.gate.wait = new Promise<void>(resolve => (release = resolve))
    return () => {
      w.gate.wait = null
      release()
    }
  }

  it('A5: leaves a screen the user opened meanwhile alone when a short answer lands', async () => {
    const w = await world(['anna', 'sam'])
    await w.openFirst()
    w.fake.tap()
    await settle()
    const release = slow(w)
    w.fake.tap()
    await settle()
    w.fake.pick('Open chat')
    await settle()
    const opened = w.router.current
    const shown = w.fake.lines()
    release()
    await settle()
    expect(w.sent()).toEqual([['anna', 'OK']])
    expect(w.router.current).toBe(opened)
    expect(w.fake.lines()).toEqual(shown)
  })

  it('A5: leaves a screen the user opened meanwhile alone when a spoken reply lands, and does not offer to send it twice', async () => {
    const w = await world(['anna', 'sam'], ['see you at twelve thirty'])
    await w.openFirst()
    await w.say()
    const release = slow(w)
    w.fake.tap()
    await settle()
    w.fake.pick('Open chat')
    await settle()
    const opened = w.router.current
    release()
    await settle()
    expect(w.router.current).toBe(opened)
    w.fake.double()
    await settle()
    if (w.router.current.id === 'draft:anna') {
      w.fake.tap()
      await settle()
    }
    expect(w.sent()).toEqual([['anna', 'see you at twelve thirty']])
  })
})

describe('undo', () => {
  const sendShort = async (w: Awaited<ReturnType<typeof world>>) => {
    await w.openFirst()
    w.fake.tap()
    await settle()
    w.fake.tap()
    await settle()
  }

  it('is offered for five seconds after a message is sent, and a tap takes the message back for everyone', async () => {
    const w = await world(['anna'])
    await sendShort(w)
    expect(w.fake.lines().at(-1)).toBe('Sent. Tap to undo')
    expect(await w.texts('anna')).toContain('OK')
    w.fake.tap()
    await settle()
    expect(await w.texts('anna')).not.toContain('OK')
    expect(w.fake.lines().slice(0, 2)).toEqual(['Anna', 'I can do 12:30 at the usual place.'])
  })

  it('goes away after five seconds, and a tap answers again instead of taking anything back', async () => {
    const w = await world(['anna'])
    await sendShort(w)
    await settle(5_000)
    expect(w.fake.lines().at(-1)).toBe('Tap to reply')
    w.fake.tap()
    await settle()
    expect(w.router.current.id).toBe('replies:anna')
    expect(await w.texts('anna')).toContain('OK')
  })

  it('is offered after a reply said aloud too', async () => {
    const w = await world(['anna'], ['see you at twelve thirty'])
    await w.openFirst()
    await w.say()
    w.fake.tap()
    await settle()
    expect(w.fake.lines().at(-1)).toBe('Sent. Tap to undo')
    w.fake.tap()
    await settle()
    expect(await w.texts('anna')).not.toContain('see you at twelve thirty')
  })
})
