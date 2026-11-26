import { createStore, Lifetime, memoryPlace } from 'earshot'
import { describe, expect, it } from 'vitest'
import { demoMessenger } from '../demo/messenger.ts'
import { Inbox } from '../inbox.ts'
import { folderRows, pickRows, setPicked } from './model.ts'

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

describe('picking a whole folder on the phone', () => {
  it('lists the account’s Telegram folders with how many chats each has', async () => {
    const { inbox } = await world()
    expect(folderRows(inbox).map(row => [row.title, row.chats, row.picked])).toEqual([
      ['Friends', '2 chats', false],
      ['Work', '2 chats', false],
    ])
  })

  it('puts every chat of a picked folder on the glasses, and takes them off with it', async () => {
    const { inbox } = await world()
    const work = folderRows(inbox).find(row => row.title === 'Work')!
    await setPicked(inbox, work.pick, true)
    expect(inbox.picked().map(chat => chat.title)).toEqual(['Launch crew', 'Glasses news'])
    await setPicked(inbox, work.pick, false)
    expect(inbox.picked()).toEqual([])
  })

  it('shows a chat that is on the glasses through its folder as picked, says through which, and keeps it apart from a pick of its own', async () => {
    const { inbox } = await world()
    await setPicked(inbox, 'sam', true)
    await setPicked(inbox, folderRows(inbox).find(row => row.title === 'Work')!.pick, true)
    expect(pickRows(inbox).map(row => [row.title, row.picked, row.through])).toEqual([
      ['Anna', false, null],
      ['Launch crew', true, 'Work'],
      ['Glasses news', true, 'Work'],
      ['Sam', true, null],
    ])
  })

  it('follows the folder: a chat the user adds to it in Telegram comes onto the glasses, and one taken out goes', async () => {
    const { inbox, messenger } = await world()
    await setPicked(inbox, folderRows(inbox).find(row => row.title === 'Work')!.pick, true)
    messenger.file('sam', [{ id: 'work', title: 'Work' }])
    messenger.file('news', [])
    await inbox.refresh()
    expect(
      inbox
        .picked()
        .map(chat => chat.title)
        .sort(),
    ).toEqual(['Launch crew', 'Sam'])
  })

  it('remembers a picked folder for the next launch', async () => {
    const { inbox, store, messenger } = await world()
    await setPicked(inbox, folderRows(inbox).find(row => row.title === 'Friends')!.pick, true)
    const next = new Inbox(new Lifetime(), messenger, store)
    await next.start()
    expect(
      next
        .picked()
        .map(chat => chat.title)
        .sort(),
    ).toEqual(['Anna', 'Sam'])
  })

  it('lists a folder that has no chat in it, so a picked one can always be unpicked', async () => {
    const { inbox, messenger } = await world()
    const work = folderRows(inbox).find(row => row.title === 'Work')!
    await setPicked(inbox, work.pick, true)
    messenger.file('launch', [])
    messenger.file('news', [])
    await inbox.refresh()
    expect(folderRows(inbox).map(row => [row.title, row.chats, row.picked])).toEqual([
      ['Friends', '2 chats', false],
      ['Work', 'No chats', true],
    ])
    await setPicked(inbox, work.pick, false)
    expect(folderRows(inbox).find(row => row.title === 'Work')?.picked).toBe(false)
  })

  it('S1: forgets the pick of a folder the user removed in Telegram, so a new folder that gets its id brings no chat onto the glasses', async () => {
    const { inbox, store, messenger } = await world()
    await setPicked(inbox, folderRows(inbox).find(row => row.title === 'Work')!.pick, true)
    messenger.unfile('work')
    await inbox.refresh()
    expect(inbox.picks()).toEqual([])
    messenger.file('sam', [{ id: 'work', title: 'Private' }])
    await inbox.refresh()
    expect(inbox.picked()).toEqual([])
    const next = new Inbox(new Lifetime(), messenger, store)
    await next.start()
    expect(next.picked()).toEqual([])
  })

  it('S1: does not take a folder that got a removed folder’s id while the app was closed for the one that was picked', async () => {
    const { inbox, store, messenger } = await world()
    await setPicked(inbox, folderRows(inbox).find(row => row.title === 'Work')!.pick, true)
    messenger.unfile('work')
    messenger.file('sam', [{ id: 'work', title: 'Private' }])
    const next = new Inbox(new Lifetime(), messenger, store)
    await next.start()
    expect(next.picked()).toEqual([])
    expect(folderRows(next).map(row => [row.title, row.picked])).toEqual([
      ['Friends', false],
      ['Private', false],
    ])
  })

  it('keeps a picked folder while Telegram cannot be asked which folders there are', async () => {
    const { inbox, messenger } = await world()
    const work = folderRows(inbox).find(row => row.title === 'Work')!
    await setPicked(inbox, work.pick, true)
    messenger.trouble({ kind: 'unreachable' })
    await inbox.refresh()
    messenger.trouble(null)
    await inbox.refresh()
    expect(inbox.picks()).toEqual([work.pick])
  })
})
