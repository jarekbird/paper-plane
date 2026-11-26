import { Long, type Dialog, type tl } from '@mtcute/core'
import { describe, expect, it } from 'vitest'
import { asksWhoIsMuted, foldersOf, mutedBy } from './folders.ts'

const user = (userId: number): tl.TypeInputPeer => ({ _: 'inputPeerUser', userId, accessHash: Long.ZERO })
const title = (text: string): tl.TypeTextWithEntities => ({ _: 'textWithEntities', text, entities: [] })
const dialog = (id: number, more: object = {}, counts: object = {}) =>
  ({
    peer: { id, type: 'user', isContact: false, isBot: false, isSelf: false, ...more },
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

describe('which chats a Telegram folder holds, by the rule Telegram’s own apps use', () => {
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

  it('counts a chat with one unread message as unread in a folder of unread chats', () => {
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

  it('takes a chat that has no setting of its own as muted when the account mutes its kind, and lets the chat’s own setting win', () => {
    const quiet = [folder({ groups: true, nonContacts: true, broadcasts: true, excludeMuted: true })]
    const group = (isMuted: boolean | null) => dialog(-1001, { type: 'chat', isGroup: true, chatType: 'supergroup' }, { isMuted })
    const channel = (isMuted: boolean | null) => dialog(-1002, { type: 'chat', isGroup: false, chatType: 'channel' }, { isMuted })
    const [groupsMuted] = foldersOf(quiet, { people: false, groups: true, channels: false })
    expect([null, false, true].map(own => groupsMuted.has(group(own)))).toEqual([false, true, false])
    expect(groupsMuted.has(channel(null))).toBe(true)
    expect(groupsMuted.has(dialog(42, {}, { isMuted: null }))).toBe(true)
    const [othersMuted] = foldersOf(quiet, { people: true, groups: false, channels: true })
    expect([group(null), channel(null), dialog(42, {}, { isMuted: null })].map(one => othersMuted.has(one))).toEqual([true, false, false])
  })

  it('asks Telegram who is muted by default only when a folder leaves muted chats out', () => {
    expect(asksWhoIsMuted([{ _: 'dialogFilterDefault' }, folder({ groups: true })])).toBe(false)
    expect(asksWhoIsMuted([folder({ groups: true, excludeMuted: true })])).toBe(true)
  })

  it('reads a default as muted while its time has not passed, or when it is silent with no time', () => {
    const now = 1_800_000_000_000
    expect(mutedBy({ muteUntil: now / 1000 + 60 }, now)).toBe(true)
    expect(mutedBy({ muteUntil: now / 1000 - 60 }, now)).toBe(false)
    expect(mutedBy({ muteUntil: 0, silent: true }, now)).toBe(false)
    expect(mutedBy({ silent: true }, now)).toBe(true)
    expect(mutedBy({}, now)).toBe(false)
  })

  it('files a person by what they are: a bot only under bots, the user’s own Saved Messages under contacts', () => {
    const [strangers] = foldersOf([folder({ nonContacts: true })])
    const [contacts] = foldersOf([folder({ contacts: true })])
    const [bots] = foldersOf([folder({ bots: true })])
    const bot = dialog(50, { isBot: true })
    const self = dialog(1, { isSelf: true })
    expect([strangers, contacts, bots].map(one => one.has(bot))).toEqual([false, false, true])
    expect([strangers, contacts, bots].map(one => one.has(self))).toEqual([false, true, false])
    expect([strangers, contacts, bots].map(one => one.has(dialog(42)))).toEqual([true, false, false])
  })

  it('files a group under groups and a channel under channels', () => {
    const [groups] = foldersOf([folder({ groups: true })])
    const [channels] = foldersOf([folder({ broadcasts: true })])
    const group = dialog(-1001, { type: 'chat', chatType: 'supergroup' })
    const channel = dialog(-1002, { type: 'chat', chatType: 'channel' })
    expect([groups.has(group), groups.has(channel), channels.has(group), channels.has(channel)]).toEqual([true, false, false, true])
  })

  it('keeps a chat in which the user was mentioned, also when it is muted or otherwise read', () => {
    const [unreadAndLoud] = foldersOf([folder({ nonContacts: true, excludeMuted: true, excludeRead: true })])
    expect(unreadAndLoud.has(dialog(42, {}, { isMuted: true, unreadMentionsCount: 1 }))).toBe(true)
    expect(unreadAndLoud.has(dialog(42, {}, { isMuted: true, unreadCount: 3 }))).toBe(false)
    expect(unreadAndLoud.has(dialog(42, {}, { unreadMentionsCount: 1, isArchived: true }))).toBe(true)
    const [notArchived] = foldersOf([folder({ nonContacts: true, excludeArchived: true })])
    expect(notArchived.has(dialog(42, {}, { unreadMentionsCount: 1, isArchived: true }))).toBe(false)
  })
})
