import { createStore, Lifetime, memoryPlace, SAMPLE_RATE, scriptedSpeech, type NavigatorModel, type Question } from 'earshot'
import { fakeBridge } from 'earshot/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_SPONSORED, demoMessenger, type DemoMessenger } from '../demo/messenger.ts'
import { Inbox } from '../inbox.ts'
import { Phrases } from '../phrases.ts'
import { startGlasses } from './app.ts'
import { display } from './display.ts'

const settle = (ms = 500) => vi.advanceTimersByTimeAsync(ms)
const tone = (ms: number) => new Uint8Array(new Int16Array((ms / 1000) * SAMPLE_RATE).map((_, at) => 8_000 * Math.sin(at / 5)).buffer)
const LONG = Array.from({ length: 30 }, (_, n) => `word${n}`).join(' ')

async function world(
  options: { picks?: string[]; said?: string[]; model?: NavigatorModel; change?: (messenger: DemoMessenger) => void } = {},
) {
  const life = new Lifetime()
  const fake = fakeBridge()
  const store = createStore([memoryPlace()])
  const messenger = demoMessenger(() => 1_700_000_000_000)
  options.change?.(messenger)
  const inbox = new Inbox(life, messenger, store)
  await inbox.start()
  await inbox.pick(options.picks ?? ['news', 'anna'])
  const app = startGlasses(life, display(life, fake.bridge), {
    inbox,
    messenger,
    phrases: new Phrases(store),
    hearing: { transcribe: scriptedSpeech(options.said ?? []), ...(options.model ? { model: options.model } : {}) },
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
  const openChannel = async () => {
    const at = fake.lines().findIndex(row => row.includes('Glasses news'))
    for (let row = 1; row < at; row++) fake.down()
    await settle()
    fake.tap()
    await settle()
  }
  const menu = () => fake.menuItems().map(item => item.name)
  return { ...app, fake, messenger, say, openChannel, menu }
}

beforeEach(() => void vi.useFakeTimers())
afterEach(() => void vi.useRealTimers())

describe('a channel', () => {
  it('G6: shows its posts, then Telegram’s sponsored message, marked as sponsored', async () => {
    const { fake, openChannel } = await world()
    await openChannel()
    expect(fake.lines()).toEqual([
      'Glasses news',
      'Heads Up build week has started.',
      'Sponsored: Sample sponsor',
      'This is where Telegram shows a sponsored message in a channel.',
      'example.org/sample',
      'Read only',
    ])
  })

  it('G6: tells Telegram the sponsored message was seen, once, when the glasses have drawn all of it', async () => {
    const { messenger, openChannel } = await world()
    expect(messenger.seenSponsored()).toEqual([])
    await openChannel()
    expect(messenger.seenSponsored()).toEqual([DEMO_SPONSORED.id])
    messenger.arrive('news', 'Glasses news', 'One more post.')
    await settle()
    expect(messenger.seenSponsored()).toEqual([DEMO_SPONSORED.id])
  })

  it('G6: does not call it seen while it is still below what the glasses show, only once it is scrolled into view', async () => {
    const { fake, messenger, openChannel } = await world({
      change: sample => {
        sample.arrive('news', 'Glasses news', LONG)
        sample.arrive('news', 'Glasses news', LONG)
        sample.arrive('news', 'Glasses news', LONG)
      },
    })
    await openChannel()
    expect(fake.lines().join(' ')).not.toContain('Sponsored')
    expect(messenger.seenSponsored()).toEqual([])
    for (let step = 0; step < 6 && !fake.lines().join(' ').includes('example.org/sample'); step++) {
      fake.down()
      await settle()
    }
    expect(fake.lines().join(' ')).toContain('Sponsored: Sample sponsor')
    expect(messenger.seenSponsored()).toEqual([DEMO_SPONSORED.id])
  })

  it('G6: calls one that is taller than the screen seen when its end has been reached from its start', async () => {
    const { fake, messenger, openChannel } = await world({
      change: sample => void (sample.sponsored = async () => ({ ...DEMO_SPONSORED, text: `${LONG} ${LONG} ${LONG} ${LONG}` })),
    })
    await openChannel()
    expect(fake.lines().join(' ')).toContain('Sponsored: Sample sponsor')
    expect(messenger.seenSponsored()).toEqual([])
    for (let step = 0; step < 8 && !fake.lines().join(' ').includes('example.org/sample'); step++) {
      fake.down()
      await settle()
    }
    expect(fake.lines().join(' ')).toContain('example.org/sample')
    expect(messenger.seenSponsored()).toEqual([DEMO_SPONSORED.id])
  })

  it('G6: is not called seen when a notice covers it', async () => {
    const { fake, messenger, openChannel } = await world({
      change: sample => {
        const sponsored = sample.sponsored
        let release = () => {}
        sample.sponsored = async chat => {
          await new Promise<void>(resolve => (release = resolve))
          return sponsored(chat)
        }
        Object.assign(sample, { release: () => release() })
      },
    })
    await openChannel()
    fake.pick('Like')
    await settle(100)
    ;(messenger as unknown as { release(): void }).release()
    await settle(300)
    expect(fake.overlay()).not.toBe('')
    expect(messenger.seenSponsored()).toEqual([])
    await settle(3_000)
    expect(fake.overlay()).toBe('')
    expect(messenger.seenSponsored()).toEqual([DEMO_SPONSORED.id])
  })

  it('shows the posts alone when Telegram gives no sponsored message or cannot be asked', async () => {
    for (const answer of [async () => null, async () => Promise.reject(new Error('no'))]) {
      const { fake, messenger, openChannel } = await world({ change: sample => void (sample.sponsored = answer) })
      await openChannel()
      expect(fake.lines()).toEqual(['Glasses news', 'Heads Up build week has started.', 'Read only'])
      expect(messenger.seenSponsored()).toEqual([])
    }
  })

  it('S6: shows a sponsored message as plain text, without characters the glasses cannot show', async () => {
    const { fake, openChannel } = await world({
      change: sample =>
        void (sample.sponsored = async () => ({
          id: 'x',
          title: 'Spon​sor `one`',
          text: 'Line one\nline two',
          link: 'https://t.me/some_channel?start=1',
        })),
    })
    await openChannel()
    const shown = fake.lines().join('\n')
    expect(shown).not.toContain('​')
    expect(shown).toContain('t.me/some_channel?start=1')
  })

  it('offers no reply: a tap sends nothing and opens nothing, and the menu has no Reply', async () => {
    const { fake, router, menu, messenger, openChannel } = await world()
    await openChannel()
    expect(menu()).not.toContain('Reply')
    expect(menu()).toContain('Like')
    fake.tap()
    await settle()
    expect(router.current.id).toBe('chat:news')
    expect(messenger.sent()).toEqual([])
  })

  it('takes nothing that is said there for a reply', async () => {
    const { router, say, messenger, openChannel } = await world({ said: ['see you at noon'] })
    await openChannel()
    await say()
    expect(router.current.id).not.toMatch(/^draft:/)
    expect(messenger.sent()).toEqual([])
  })

  it('is opened, not written to, by "message Glasses news …"', async () => {
    const { router, say } = await world({ said: ['message Glasses news hello there'] })
    await say()
    expect(router.current.id).toBe('chat:news')
  })

  it('S1, G5: offers a model nothing of the sponsored message', async () => {
    const asked: Question[] = []
    const model: NavigatorModel = {
      choose: async question => {
        asked.push(question)
        return {}
      },
    }
    const { say, openChannel } = await world({ said: ['what is this'], model })
    await openChannel()
    await say()
    expect(asked).toHaveLength(1)
    const offered = JSON.stringify(asked).toLowerCase()
    for (const kept of ['sponsor', 'example.org', 'telegram shows', 'heads up', 'glasses news']) expect(offered).not.toContain(kept)
  })

  it('likes its top post, with the sponsored message never taken for a post', async () => {
    const { fake, messenger, openChannel } = await world()
    await openChannel()
    fake.pick('Like')
    await settle()
    expect((await messenger.history('news', 5)).map(message => message.liked)).toEqual([true])
  })
})

describe('a chat with a person', () => {
  it('G6: asks Telegram for no sponsored message and shows none', async () => {
    let asked = 0
    const { fake } = await world({
      picks: ['anna'],
      change: sample => {
        const sponsored = sample.sponsored
        sample.sponsored = chat => {
          asked++
          return sponsored(chat)
        }
      },
    })
    fake.tap()
    await settle()
    expect(fake.lines()[0]).toBe('Anna')
    expect(asked).toBe(0)
    expect(fake.lines().join(' ')).not.toContain('Sponsored')
  })
})
