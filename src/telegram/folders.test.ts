import { Long, type Dialog, type tl } from '@mtcute/core'
import { describe, expect, it } from 'vitest'
import { foldersOf } from './folders.ts'

const user = (userId: number): tl.TypeInputPeer => ({ _: 'inputPeerUser', userId, accessHash: Long.ZERO })
const title = (text: string): tl.TypeTextWithEntities => ({ _: 'textWithEntities', text, entities: [] })
const dialog = (id: number, more: object = {}, counts: object = {}) =>
  ({
    peer: { id, type: 'user', isContact: false, isBot: false, ...more },
    unreadCount: 0,
    unreadMentionsCount: 0,
    isManuallyUnread: false,
    isMuted: false,
    isArchived: false,
    ...counts,
  }) as unknown as Dialog
const folder = (more: Partial<tl.RawDialogFilter>): tl.RawDialogFilter => ({
  _: 'dialogFilter',
  id: 2,
  title: title('Work'),
  pinnedPeers: [],
  includePeers: [],
  excludePeers: [],
  ...more,
})

describe('which chats a Telegram folder holds, by the library’s own rule', () => {
  it('holds the chats pinned in the folder, which Telegram lists apart from the ones it includes', () => {
    const [work] = foldersOf([folder({ pinnedPeers: [user(42)], includePeers: [user(43)] })])
    expect([42, 43, 44].map(id => work.has(dialog(id)))).toEqual([true, true, false])
  })

  it('holds the chats of a shared folder too, pinned or not', () => {
    const shared: tl.RawDialogFilterChatlist = {
      _: 'dialogFilterChatlist',
      id: 3,
      title: title('Team'),
      pinnedPeers: [user(42)],
      includePeers: [user(43)],
    }
    const [team] = foldersOf([shared])
    expect([42, 43, 44].map(id => team.has(dialog(id)))).toEqual([true, true, false])
  })

  it('follows a folder made by a rule, and its exceptions', () => {
    const [contacts] = foldersOf([folder({ contacts: true, excludePeers: [user(43)] })])
    expect(contacts.has(dialog(42, { isContact: true }))).toBe(true)
    expect(contacts.has(dialog(43, { isContact: true }))).toBe(false)
    expect(contacts.has(dialog(44))).toBe(false)
  })

  it('leaves out "All chats", which is no folder to pick, and keeps each folder’s id and name', () => {
    const folders = foldersOf([{ _: 'dialogFilterDefault' }, folder({ id: 7, title: title('Family') })])
    expect(folders.map(one => [one.id, one.title])).toEqual([[7, 'Family']])
  })

  it('counts a chat with one unread message as unread in a folder of unread chats, where the library counts from two', () => {
    const [unread] = foldersOf([folder({ nonContacts: true, excludeRead: true })])
    expect([0, 1, 2].map(unreadCount => unread.has(dialog(42, {}, { unreadCount })))).toEqual([false, true, true])
    expect(unread.has(dialog(42, {}, { isManuallyUnread: true }))).toBe(true)
    expect(unread.has(dialog(42, {}, { unreadMentionsCount: 1 }))).toBe(true)
  })

  it('leaves muted and archived chats out of a folder that excludes them', () => {
    const [quiet] = foldersOf([folder({ nonContacts: true, excludeMuted: true, excludeArchived: true })])
    expect(quiet.has(dialog(42))).toBe(true)
    expect(quiet.has(dialog(42, {}, { isMuted: true }))).toBe(false)
    expect(quiet.has(dialog(42, {}, { isArchived: true }))).toBe(false)
  })
})
