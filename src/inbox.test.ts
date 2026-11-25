import { createStore, Lifetime, memoryPlace } from 'earshot'
import { describe, expect, it } from 'vitest'
import { demoMessenger } from './demo/messenger.ts'
import { Inbox } from './inbox.ts'

describe('the list of an account’s chats', () => {
  it('A4: asks its account nothing more once its session has ended, also for a refresh that was waiting its turn', async () => {
    const life = new Lifetime()
    const messenger = demoMessenger(() => 1_700_000_000_000)
    const inbox = new Inbox(life, messenger, createStore([memoryPlace()]))
    await inbox.start()
    const chats = messenger.chats
    let asked = 0
    let answer = () => {}
    messenger.chats = async () => {
      asked++
      await new Promise<void>(resolve => (answer = resolve))
      return chats()
    }
    void inbox.refresh()
    messenger.arrive('sam', 'Sam', 'Hello')
    expect(asked).toBe(1)
    life.end()
    answer()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(asked).toBe(1)
    await inbox.refresh()
    expect(asked).toBe(1)
  })

  it('tells nobody of chats that arrive after its session has ended', async () => {
    const life = new Lifetime()
    const messenger = demoMessenger(() => 1_700_000_000_000)
    const inbox = new Inbox(life, messenger, createStore([memoryPlace()]))
    await inbox.start()
    let told = 0
    inbox.onChange(() => told++)
    let answer = () => {}
    const chats = messenger.chats
    messenger.chats = async () => {
      await new Promise<void>(resolve => (answer = resolve))
      return chats()
    }
    void inbox.refresh()
    life.end()
    answer()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(told).toBe(0)
  })
})
