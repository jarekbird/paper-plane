import { createStore, Lifetime, memoryPlace } from 'earshot'
import { describe, expect, it } from 'vitest'
import { demoMessenger } from '../demo/messenger.ts'
import { Inbox } from '../inbox.ts'
import { pickRows, setPicked } from './model.ts'

async function world() {
  const store = createStore([memoryPlace()])
  const messenger = demoMessenger(() => 1_700_000_000_000)
  const inbox = new Inbox(new Lifetime(), messenger, store)
  await inbox.start()
  return { inbox, store, messenger }
}

describe('picking chats on the phone', () => {
  it('lists every chat of the account, none picked before the user chooses', async () => {
    const { inbox } = await world()
    expect(pickRows(inbox).map(row => [row.title, row.kind, row.picked])).toEqual([
      ['Anna', 'Person', false],
      ['Launch crew', 'Group', false],
      ['Glasses news', 'Channel', false],
      ['Sam', 'Person', false],
    ])
  })

  it('puts a picked chat on the glasses and takes an unpicked one off', async () => {
    const { inbox } = await world()
    await setPicked(inbox, 'sam', true)
    await setPicked(inbox, 'anna', true)
    await setPicked(inbox, 'sam', false)
    expect(inbox.picked().map(chat => chat.title)).toEqual(['Anna'])
  })

  it('remembers the picks for the next launch', async () => {
    const { inbox, store, messenger } = await world()
    await setPicked(inbox, 'launch', true)
    const next = new Inbox(new Lifetime(), messenger, store)
    await next.start()
    expect(next.picked().map(chat => chat.title)).toEqual(['Launch crew'])
    expect(next.fresh).toBe(false)
  })

  it('knows a first launch, when nothing was ever picked', async () => {
    const { inbox } = await world()
    expect(inbox.fresh).toBe(true)
  })
})
