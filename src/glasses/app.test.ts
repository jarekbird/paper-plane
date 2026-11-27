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

async function world(picks: string[], said: string[] = [], own: string[] = [], model?: NavigatorModel) {
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
  const app = startGlasses(life, display(life, fake.bridge), {
    inbox,
    messenger,
    phrases,
    hearing: { transcribe: scriptedSpeech(said), ...(model ? { model } : {}) },
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
    expect(fake.lines()).toEqual(['Paper Plane', '> Anna (2)', '@ Launch crew (1)'])
  })

  it('marks a chat in which a new message mentions the user, and no longer once it was read', async () => {
    const { fake, messenger } = await world(['sam', 'launch'])
    expect(fake.lines()).toEqual(['Paper Plane', '> @ Launch crew (1)', 'Sam'])
    messenger.arrive('sam', 'Sam', '@you Are you there?', true)
    await settle()
    expect(fake.lines()).toEqual(['Paper Plane', '> @ Sam (1)', '@ Launch crew (1)'])
    await messenger.read('sam')
    await settle()
    expect(fake.lines()).toEqual(['Paper Plane', '> @ Launch crew (1)', 'Sam'])
  })

  it('clears a mention whose message was already read elsewhere, once its chat is opened, and counts it for "mark all read"', async () => {
    const { fake, messenger, openFirst } = await world(['launch'])
    messenger.readElsewhere('launch')
    await settle()
    expect(fake.lines()).toEqual(['Paper Plane', '> @ Launch crew'])
    expect(fake.menuItems().map(item => item.name)).toContain('Mark all read')
    await openFirst()
    fake.double()
    await settle()
    expect(fake.lines()).toEqual(['Paper Plane', '> Launch crew'])
  })

  it('lists the chats with something new first, and the others below in Telegram’s order', async () => {
    const { fake, messenger } = await world(['news', 'sam', 'launch', 'anna'])
    expect(fake.lines()).toEqual(['Paper Plane', '> Anna (2)', '@ Launch crew (1)', 'Glasses news', 'Sam'])
    await messenger.read('anna')
    await settle()
    expect(fake.lines()).toEqual(['Paper Plane', '> @ Launch crew (1)', 'Anna', 'Glasses news', 'Sam'])
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
  it('is marked read only when it has something new, so opening it does not keep asking Telegram', async () => {
    const { messenger, openFirst } = await world(['sam'])
    const read = vi.spyOn(messenger, 'read')
    const history = vi.spyOn(messenger, 'history')
    await openFirst()
    await settle(5_000)
    expect(read).not.toHaveBeenCalled()
    expect(history).toHaveBeenCalledTimes(1)
  })

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

  it('is marked read once, also when Telegram reports the read itself and the list of chats is slow to refresh', async () => {
    const { messenger, openFirst } = await world(['anna'])
    const mine = (await messenger.history('anna', 6)).find(message => message.mine)!
    const read = messenger.read
    let reads = 0
    messenger.read = async chat => {
      reads++
      await read(chat)
      messenger.edit(mine, mine.text)
    }
    const history = vi.spyOn(messenger, 'history')
    messenger.chats = () => new Promise(() => {})
    await openFirst()
    await settle(5_000)
    expect(reads).toBe(1)
    expect(history.mock.calls.length).toBeLessThanOrEqual(3)
  })

  it('names who wrote each message in a group', async () => {
    const { fake, openFirst } = await world(['launch'])
    await openFirst()
    expect(fake.lines()[1]).toBe('Cy: @you Can you confirm the demo time for Thursday?')
  })

  it('marks a message read that arrives while the chat is open', async () => {
    const { messenger, unread, openFirst } = await world(['anna'])
    await openFirst()
    messenger.arrive('anna', 'Anna', 'Or one, if that is easier.')
    await settle()
    expect(await unread('anna')).toBe(0)
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

  it('is not started by words the glasses cannot show at all', async () => {
    const { say, router, openFirst } = await world(['anna'], ['\u200b'])
    await openFirst()
    await say()
    expect(router.current.id).toBe('chat:anna')
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
    await settle()
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', 'No']])
    expect(router.current.id).toBe('chat:anna')
  })

  it('S5: is not sent by a tap that comes before the glasses have drawn which row is chosen', async () => {
    const { fake, sent, openFirst } = await world(['anna'])
    await openFirst()
    fake.tap()
    await settle()
    fake.down()
    fake.tap()
    await settle()
    expect(sent()).toEqual([])
    fake.tap()
    await settle()
    expect(sent()).toEqual([['anna', 'Thanks']])
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

describe('by voice, from any screen', () => {
  it('S1, G5: offers a model nothing read from Telegram and none of the user’s phrases', async () => {
    const asked: Question[] = []
    const model: NavigatorModel = {
      choose: async question => {
        asked.push(question)
        return {}
      },
    }
    const { say, openFirst } = await world(
      ['anna', 'launch', 'sam'],
      ['what is new', 'anything else'],
      ['In a meeting, back at three'],
      model,
    )
    await say()
    await openFirst()
    await say()
    expect(asked).toHaveLength(2)
    const offered = JSON.stringify(asked).toLowerCase()
    for (const kept of ['anna', 'launch', 'crew', 'sam', '12:30', 'usual place', 'lunch', 'in a meeting'])
      expect(offered).not.toContain(kept)
    expect(offered).toContain('open chat')
  })

  it('opens a chat said by name, the name matched on the phone', async () => {
    const { say, router } = await world(['anna', 'launch', 'sam'], ['open launch crew'])
    await say()
    expect(router.current.id).toBe('chat:launch')
    expect(router.depth).toBe(2)
  })

  it('opens the named chat from inside another one, with only the list behind it', async () => {
    const { say, router, openFirst } = await world(['anna', 'launch', 'sam'], ['open launch crew'])
    await openFirst()
    await say()
    expect(router.current.id).toBe('chat:launch')
    expect(router.depth).toBe(2)
  })

  it('asks which chat when no picked chat was named', async () => {
    const { fake, say, router } = await world(['anna', 'sam'], ['open the chat'])
    await say()
    await settle(2_500)
    expect(fake.lines()).toEqual(['Which chat?', '> Anna (2)', 'Sam'])
    fake.down()
    await settle()
    fake.tap()
    await settle()
    expect(router.current.id).toBe('chat:sam')
    expect(router.depth).toBe(2)
  })

  it('S5: starts a message to a chat said by name with the words after the name, and sends it only by a tap', async () => {
    const { fake, say, sent, router } = await world(['anna', 'sam'], ['message Sam the demo moved to four'])
    await say()
    await settle(2_500)
    expect(fake.lines()).toEqual(['To Sam', 'the demo moved to four', 'Tap to send'])
    expect(sent()).toEqual([])
    fake.tap()
    await settle()
    expect(sent()).toEqual([['sam', 'the demo moved to four']])
    expect(router.current.id).toBe('chat:sam')
    expect(fake.lines().at(-1)).toBe('Sent. Tap to undo')
  })

  it('opens the chat, ready for a hold, when a name is said with no message', async () => {
    const { say, router, sent } = await world(['anna', 'sam'], ['message Sam'])
    await say()
    expect(router.current.id).toBe('chat:sam')
    expect(sent()).toEqual([])
  })

  it('never writes to a chat that was not picked, also when it is named', async () => {
    const { fake, say, sent } = await world(['anna'], ['message Sam the demo moved to four'])
    await say()
    expect(fake.lines()[0]).toBe('Which chat?')
    expect(sent()).toEqual([])
  })

  it('S5: marks every picked chat read only after a tap, when it was said', async () => {
    const { fake, say, unread } = await world(['anna', 'launch'], ['mark all read'])
    await say()
    expect(await unread('anna')).toBe(2)
    expect(fake.overlay()).toContain('Tap to confirm')
    fake.tap()
    await settle()
    expect([await unread('anna'), await unread('launch')]).toEqual([0, 0])
    expect(fake.lines()).toEqual(['Paper Plane', '> Anna', 'Launch crew'])
  })

  it('A5: does not use what was said in an earlier hold for a touch that follows at once', async () => {
    const { fake, say, router } = await world(['anna', 'sam'], ['Sam'])
    await say()
    expect(router.depth).toBe(1)
    fake.pick('Message someone')
    await settle()
    expect(router.current.id).toBe('pick-chat')
  })

  it('A5: does not aim a reply dictated in one chat at another chat named in it', async () => {
    const { fake, say, router, sent, openFirst } = await world(['anna', 'sam'], ['Sam must not see this'])
    await openFirst()
    await say()
    expect(fake.lines().slice(0, 2)).toEqual(['To Anna', 'Sam must not see this'])
    fake.double()
    await settle()
    fake.pick('Message someone')
    await settle()
    expect(router.current.id).toBe('pick-chat')
    expect(sent()).toEqual([])
  })

  it('A5: takes a name said at "Which chat?" as the choice, never as a message to the chat underneath', async () => {
    const { fake, say, router, sent, openFirst } = await world(['anna', 'sam'], ['message someone', 'Sam'])
    await openFirst()
    await say()
    expect(router.current.id).toBe('pick-chat')
    await say()
    await settle(2_500)
    expect(router.current.id).toBe('chat:sam')
    expect(router.depth).toBe(2)
    expect(fake.lines()[0]).toBe('Sam')
    expect(sent()).toEqual([])
  })

  it('A5: stays at "Which chat?" when what is said names no picked chat', async () => {
    const { fake, say, router, sent, openFirst } = await world(['anna', 'sam'], ['message someone', 'Robert tomorrow'])
    await openFirst()
    await say()
    await say()
    expect(router.current.id).toBe('pick-chat')
    expect(fake.overlay()).toContain('No chat by that name')
    await settle(5_000)
    expect(fake.lines()).toEqual(['Which chat?', '> Anna', 'Sam'])
    expect(sent()).toEqual([])
  })

  it('takes "message <chat>" as a message whatever follows, also words that are commands on their own', async () => {
    const { fake, say, sent } = await world(['anna', 'sam'], ['message Sam I will go back tomorrow'])
    await say()
    await settle(2_500)
    expect(fake.lines()).toEqual(['To Sam', 'I will go back tomorrow', 'Tap to send'])
    expect(sent()).toEqual([])
  })

  it('S1: asks no model at all when the command names its chat', async () => {
    let asked = 0
    const model: NavigatorModel = {
      choose: async () => {
        asked++
        return {}
      },
    }
    const { say, router } = await world(['anna', 'launch'], ['open launch crew'], [], model)
    await say()
    expect(router.current.id).toBe('chat:launch')
    expect(asked).toBe(0)
  })

  it('A5: marks read only the chats that were unread and picked when it was said', async () => {
    const { fake, say, unread, inbox } = await world(['anna'], ['mark all read'])
    await say()
    expect(fake.overlay()).toContain('Tap to confirm')
    await inbox.pick(['launch'])
    fake.tap()
    await settle()
    expect([await unread('anna'), await unread('launch')]).toEqual([2, 1])
  })

  it('marks every picked chat read at once when it is chosen by touch', async () => {
    const { fake, unread } = await world(['anna', 'launch'])
    fake.pick('Mark all read')
    await settle()
    expect([await unread('anna'), await unread('launch')]).toEqual([0, 0])
  })

  it('asks which chat when the one named after "message" is not picked, whatever names follow', async () => {
    const { fake, say, router, sent } = await world(['anna', 'sam'], ['message Robert ask Sam about lunch'])
    await say()
    await settle(2_500)
    expect(router.current.id).toBe('pick-chat')
    expect(fake.lines()[0]).toBe('Which chat?')
    expect(sent()).toEqual([])
  })

  it('A4: says nothing on glasses that are gone when the app ends while chats are being marked read', async () => {
    const w = await world(['anna', 'launch'])
    let fail = (_: Error) => {}
    w.messenger.read = () => new Promise<void>((_, reject) => (fail = reject))
    const noticed = vi.spyOn(w.shell, 'notice')
    w.fake.pick('Mark all read')
    await settle()
    w.life.end()
    fail(new Error('offline'))
    await settle()
    expect(noticed).not.toHaveBeenCalled()
  })

  it('opens the chat, with no reply started, when only a full stop follows the name', async () => {
    const { say, router } = await world(['anna', 'sam'], ['Message Sam.'])
    await say()
    expect(router.current.id).toBe('chat:sam')
  })

  it('asks which chat, and does nothing else, when "message" on the list is followed by a chat that is not picked and by command words', async () => {
    const { fake, say, router, sent } = await world(['anna', 'sam'], ['message Robert I will go back tomorrow'])
    await say()
    await settle(2_500)
    expect(router.current.id).toBe('pick-chat')
    expect(fake.lines()[0]).toBe('Which chat?')
    expect(sent()).toEqual([])
  })

  it('keeps such a sentence as the reply when a chat is open, where replies often start with "tell" or "open"', async () => {
    const { fake, say, router, sent, openFirst } = await world(
      ['anna', 'sam'],
      ['message Robert I will go back tomorrow', 'tell me when you arrive'],
    )
    await openFirst()
    await say()
    await settle(2_500)
    expect(fake.lines()).toEqual(['To Anna', 'message Robert I will go back tomorrow', 'Tap to send'])
    await say()
    await settle(2_500)
    expect(fake.lines()).toEqual(['To Anna', 'tell me when you arrive', 'Tap to send'])
    expect(router.depth).toBe(3)
    expect(sent()).toEqual([])
  })
})

describe('a reply kept for later', () => {
  it('becomes the chat’s draft in Telegram, exactly as shown, and the chat comes back', async () => {
    const { fake, say, router, sent, messenger, openFirst } = await world(['anna'], ['see you at twelve thirty'])
    await openFirst()
    await say()
    fake.pick('Keep for later')
    await settle()
    expect(messenger.drafts().get('anna')).toBe('see you at twelve thirty')
    expect(router.current.id).toBe('chat:anna')
    expect(fake.overlay()).toContain('Kept as a draft')
    expect(sent()).toEqual([])
  })

  it('never replaces a draft that is already waiting on the phone', async () => {
    const { fake, say, router, messenger, openFirst } = await world(['anna'], ['see you at twelve thirty'])
    await messenger.keep('anna', 'typed on the phone', new AbortController().signal)
    await openFirst()
    await say()
    fake.pick('Keep for later')
    await settle()
    expect(messenger.drafts().get('anna')).toBe('typed on the phone')
    expect(router.current.id).toBe('draft:anna')
    expect(fake.overlay()).toContain('Your phone already has a draft')
  })

  it('S5: asks for a tap first when keeping is said', async () => {
    const { fake, say, messenger, openFirst } = await world(['anna'], ['see you at twelve thirty', 'keep for later'])
    await openFirst()
    await say()
    await say()
    expect(messenger.drafts().size).toBe(0)
    expect(fake.overlay()).toContain('Tap to confirm')
    fake.tap()
    await settle()
    expect(messenger.drafts().get('anna')).toBe('see you at twelve thirty')
  })

  it('cannot be sent as well once it is kept', async () => {
    const { fake, say, sent, messenger, openFirst } = await world(['anna'], ['see you at twelve thirty'])
    let release = () => {}
    const keep = messenger.keep
    messenger.keep = async (chat, text, signal) => {
      await new Promise<void>(resolve => (release = resolve))
      return keep(chat, text, signal)
    }
    await openFirst()
    await say()
    fake.pick('Keep for later')
    await settle()
    fake.tap()
    await settle()
    release()
    await settle()
    expect(sent()).toEqual([])
    expect(messenger.drafts().get('anna')).toBe('see you at twelve thirty')
  })
})

describe('a reply kept for later, when the user moves on', () => {
  it('is still kept when the user leaves the reply before Telegram has answered, and says so', async () => {
    const { fake, say, router, messenger, openFirst } = await world(['anna'], ['see you at twelve thirty'])
    let release = () => {}
    const keep = messenger.keep
    messenger.keep = async (chat, text, signal) => {
      await new Promise<void>(resolve => (release = resolve))
      return keep(chat, text, signal)
    }
    await openFirst()
    await say()
    fake.pick('Keep for later')
    await settle()
    fake.double()
    await settle()
    expect(router.current.id).toBe('chat:anna')
    release()
    await settle()
    expect(messenger.drafts().get('anna')).toBe('see you at twelve thirty')
    expect(router.current.id).toBe('chat:anna')
    expect(fake.overlay()).toContain('Kept as a draft')
  })

  it('A4: is not kept, and nothing is said, once the app has ended', async () => {
    const w = await world(['anna'], ['see you at twelve thirty'])
    let release = () => {}
    const keep = w.messenger.keep
    w.messenger.keep = async (chat, text, signal) => {
      await new Promise<void>(resolve => (release = resolve))
      return keep(chat, text, signal)
    }
    await w.openFirst()
    await w.say()
    w.fake.pick('Keep for later')
    await settle()
    const noticed = vi.spyOn(w.shell, 'notice')
    w.life.end()
    release()
    await settle()
    expect(w.messenger.drafts().size).toBe(0)
    expect(noticed).not.toHaveBeenCalled()
  })
})

describe('the newest message from someone else', () => {
  const NEWEST = 'I can do 12:30 at the usual place.'

  it('is liked by a pick in the menu, and shows it', async () => {
    const { fake, texts, messenger, openFirst } = await world(['anna'])
    await openFirst()
    fake.pick('Like')
    await settle()
    expect((await messenger.history('anna', 6)).filter(message => message.liked).map(message => message.text)).toEqual([NEWEST])
    expect(fake.lines()[1]).toBe(`${NEWEST} 👍`)
    expect(fake.overlay()).toContain('Liked')
    expect(await texts('anna')).toHaveLength(3)
  })

  it('S5, A5: liked by voice, asks for a tap, and nothing is liked if a newer message arrived meanwhile', async () => {
    const { fake, say, messenger, openFirst } = await world(['anna'], ['like that'])
    await openFirst()
    await say()
    expect(fake.overlay()).toContain('Tap to confirm')
    messenger.arrive('anna', 'Anna', 'One more thing')
    await settle()
    fake.tap()
    await settle()
    expect((await messenger.history('anna', 6)).some(message => message.liked)).toBe(false)
  })

  it('A5: is not liked by a tap that comes while a newer message is still loading', async () => {
    const { fake, say, messenger, openFirst } = await world(['anna'], ['like that'])
    await openFirst()
    await say()
    expect(fake.overlay()).toContain('Tap to confirm')
    const history = messenger.history
    let release = () => {}
    messenger.history = async (chat, limit) => {
      await new Promise<void>(resolve => (release = resolve))
      return history(chat, limit)
    }
    messenger.arrive('anna', 'Anna', 'One more thing')
    await settle()
    fake.tap()
    await settle()
    messenger.history = history
    release()
    await settle()
    expect((await messenger.history('anna', 6)).some(message => message.liked)).toBe(false)
  })

  it('S5: is not liked or saved when it is not on screen, after six of the user’s own replies', async () => {
    const { fake, messenger, openFirst } = await world(['sam'])
    for (let n = 1; n <= 6; n++) await messenger.send('sam', `Reply ${n}`)
    await openFirst()
    fake.pick('Like')
    await settle()
    expect(fake.overlay()).toContain('No message from someone else on screen')
    fake.pick('Save')
    await settle()
    expect((await messenger.history('sam', 10)).some(message => message.liked)).toBe(false)
    expect(messenger.saved()).toEqual([])
  })

  it('S5: is not liked or saved while a long reply of the user’s own hides it, and is once the user scrolls to it', async () => {
    const { fake, messenger, openFirst } = await world(['sam'])
    await messenger.send('sam', Array.from({ length: 30 }, (_, n) => `This is sentence ${n + 1} of one long reply.`).join(' '))
    await openFirst()
    expect(fake.lines().join(' ')).not.toContain('Thanks for yesterday.')
    fake.pick('Like')
    await settle()
    expect(fake.overlay()).toContain('No message from someone else on screen')
    fake.pick('Save')
    await settle(5_000)
    expect((await messenger.history('sam', 10)).some(message => message.liked)).toBe(false)
    expect(messenger.saved()).toEqual([])
    for (let swipe = 0; swipe < 30 && !fake.lines().join(' ').includes('Thanks for yesterday.'); swipe++) {
      fake.down()
      await settle()
    }
    fake.pick('Like')
    await settle()
    expect((await messenger.history('sam', 10)).filter(message => message.liked).map(message => message.text)).toEqual([
      'Thanks for yesterday.',
    ])
  })

  it('likes the first message from someone else that is in view after scrolling, not a newer one above it', async () => {
    const { fake, messenger, openFirst } = await world(['sam'])
    for (let n = 1; n <= 5; n++) messenger.arrive('sam', 'Sam', `Note ${n}`)
    messenger.arrive('sam', 'Sam', Array.from({ length: 30 }, (_, n) => `Sentence ${n + 1} of a long message from Sam.`).join(' '))
    await settle()
    await openFirst()
    let before = ''
    for (let swipe = 0; swipe < 40 && fake.lines().join('|') !== before; swipe++) {
      before = fake.lines().join('|')
      fake.down()
      await settle()
    }
    await settle(5_000)
    expect(fake.lines().join(' ')).not.toContain('long message from Sam')
    const top = fake.lines().find(shown => shown.startsWith('Note'))
    fake.pick('Like')
    await settle()
    const liked = (await messenger.history('sam', 10)).filter(message => message.liked).map(message => message.text)
    expect(liked).toEqual([top])
    expect(liked).not.toEqual(['Note 5'])
  })

  it('A5: is not liked from an old view after a newer message failed to load', async () => {
    const { fake, messenger, openFirst } = await world(['anna'])
    await openFirst()
    const history = messenger.history
    messenger.history = async () => {
      throw new Error('offline')
    }
    messenger.arrive('anna', 'Anna', 'One more thing')
    await settle()
    expect(fake.lines()[1]).toBe('Could not load this chat')
    expect(fake.menuItems().map(item => item.name)).not.toContain('Like')
    messenger.history = history
    expect((await messenger.history('anna', 6)).some(message => message.liked)).toBe(false)
  })

  it('A5: shows the newest history when an older load answers last', async () => {
    const { fake, messenger, openFirst } = await world(['anna'])
    await openFirst()
    const history = messenger.history
    const waiting: (() => void)[] = []
    messenger.history = async (chat, limit) => {
      const answer = await history(chat, limit)
      await new Promise<void>(resolve => waiting.push(resolve))
      return answer
    }
    messenger.arrive('anna', 'Anna', 'First of two')
    await settle()
    messenger.arrive('anna', 'Anna', 'Second of two')
    await settle()
    expect(waiting).toHaveLength(2)
    waiting[1]()
    await settle()
    waiting[0]()
    await settle()
    expect(fake.lines()[1]).toBe('Second of two')
  })

  it('shows the new text when it is edited, and saves what is shown', async () => {
    const { fake, messenger, openFirst } = await world(['anna'])
    await openFirst()
    const newest = (await messenger.history('anna', 1))[0]
    messenger.edit(newest, 'I can do 1:30 instead.')
    await settle()
    expect(fake.lines()[1]).toBe('I can do 1:30 instead.')
    fake.pick('Save')
    await settle()
    expect(messenger.saved().map(message => message.text)).toEqual(['I can do 1:30 instead.'])
  })

  it('S5: is not saved when it is edited between the spoken command and the tap', async () => {
    const { fake, say, messenger, openFirst } = await world(['anna'], ['save this'])
    await openFirst()
    await say()
    expect(fake.overlay()).toContain('Tap to confirm')
    messenger.edit((await messenger.history('anna', 1))[0], 'Send 500 to this account.')
    await settle()
    fake.tap()
    await settle()
    expect(messenger.saved()).toEqual([])
  })

  it('S5: is not saved from the old text while the edited one is still loading', async () => {
    const { fake, messenger, openFirst } = await world(['anna'])
    await openFirst()
    const history = messenger.history
    let release = () => {}
    messenger.history = async (chat, limit) => {
      await new Promise<void>(resolve => (release = resolve))
      return history(chat, limit)
    }
    messenger.edit((await history('anna', 1))[0], 'Send 500 to this account.')
    await settle()
    fake.pick('Save')
    await settle()
    expect(messenger.saved()).toEqual([])
    messenger.history = history
    release()
    await settle()
  })

  it('S5: is not saved from the old text when it is edited and the list of chats is still refreshing', async () => {
    const { fake, messenger, openFirst } = await world(['anna'])
    await openFirst()
    const chats = messenger.chats
    let release = () => {}
    messenger.chats = async () => {
      await new Promise<void>(resolve => (release = resolve))
      return chats()
    }
    messenger.edit((await messenger.history('anna', 1))[0], 'Send 500 to this account.')
    fake.pick('Save')
    await settle()
    expect(messenger.saved()).toEqual([])
    messenger.chats = chats
    release()
    await settle()
  })

  it('S5: is not saved while the glasses have not yet drawn its edited text', async () => {
    const { fake, messenger, openFirst } = await world(['anna'])
    await openFirst()
    fake.refuse('update', 1)
    messenger.edit((await messenger.history('anna', 1))[0], 'Send 500 to this account.')
    await settle(100)
    expect(fake.lines()[1]).toBe('I can do 12:30 at the usual place.')
    fake.pick('Save')
    await settle(100)
    expect(messenger.saved()).toEqual([])
    await settle(3_000)
    expect(fake.lines()[1]).toBe('Send 500 to this account.')
    fake.pick('Save')
    await settle()
    expect(messenger.saved().map(message => message.text)).toEqual(['Send 500 to this account.'])
  })

  it('S5: is not saved when its ending is edited under a notice that covers it', async () => {
    const { fake, messenger, openFirst } = await world(['sam'])
    const long = Array.from({ length: 8 }, (_, n) => `Line ${n + 1} of the plan.`).join('\n')
    const arrived = messenger.arrive('sam', 'Sam', long)
    await settle()
    await openFirst()
    fake.pick('Save')
    await settle(100)
    expect(fake.overlay()).toContain('Saved')
    messenger.edit(arrived, long.replace('Line 8 of the plan.', 'Line 8: send 500 to this account.'))
    await settle(100)
    expect(fake.overlay()).toContain('Saved')
    fake.pick('Save')
    await settle(100)
    expect(messenger.saved()).toHaveLength(1)
    await settle(8_000)
    expect(fake.overlay()).toBe('')
    fake.pick('Save')
    await settle()
    expect(messenger.saved().map(message => message.text.includes('send 500'))).toEqual([false, true])
  })

  it('can be liked right after it was saved, while the notice is still up, when nothing changed', async () => {
    const { fake, messenger, openFirst } = await world(['anna'])
    await openFirst()
    fake.pick('Save')
    await settle(100)
    expect(fake.overlay()).toContain('Saved')
    fake.pick('Like')
    await settle(100)
    expect((await messenger.history('anna', 6)).filter(message => message.liked)).toHaveLength(1)
  })

  it('is not liked twice', async () => {
    const { fake, openFirst } = await world(['anna'])
    await openFirst()
    fake.pick('Like')
    await settle(5_000)
    fake.pick('Like')
    await settle()
    expect(fake.overlay()).toContain('Already liked')
  })

  it('is copied to Saved Messages by a pick in the menu', async () => {
    const { fake, messenger, openFirst } = await world(['anna'])
    await openFirst()
    fake.pick('Save')
    await settle()
    expect(messenger.saved().map(message => message.text)).toEqual([NEWEST])
    expect(fake.overlay()).toContain('Saved')
  })

  it('is saved once when the menu is picked twice in a row', async () => {
    const { fake, messenger, openFirst } = await world(['anna'])
    await openFirst()
    fake.pick('Save')
    fake.pick('Save')
    await settle()
    expect(messenger.saved()).toHaveLength(1)
  })

  it('A4: says nothing on glasses that are gone when the app ends while a like is on its way', async () => {
    const w = await world(['anna'])
    let fail = (_: Error) => {}
    w.messenger.like = () => new Promise<void>((_, reject) => (fail = reject))
    await w.openFirst()
    const noticed = vi.spyOn(w.shell, 'notice')
    w.fake.pick('Like')
    await settle()
    w.life.end()
    fail(new Error('offline'))
    await settle()
    expect(noticed).not.toHaveBeenCalled()
  })
})
