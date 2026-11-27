import { Lifetime } from 'earshot'
import { tl } from '@mtcute/core'
import { describe, expect, it, vi } from 'vitest'
import { messengerContract } from '../messenger.contract.ts'
import { TroubleError } from '../messenger.ts'
import type { DialogLike, MessageLike, PeerLike } from './map.ts'
import { GRACE_MS, messengerOver, type ClientLike, type LinkState } from './messenger.ts'
import { ANSWER_MS, answerWithin } from './trouble.ts'

const refusal = (text: string, more: object = {}) => Object.assign(new tl.RpcError(400, text as never), more)

function fakeClient() {
  let serial = 0
  let clock = 1_700_000_000_000
  const me: PeerLike = { type: 'user', id: 1, displayName: 'Me' }
  const peers: PeerLike[] = [
    { type: 'user', id: 42, displayName: 'Anna Lee' },
    { type: 'chat', id: -1001234, displayName: 'Launch crew', chatType: 'supergroup' },
    { type: 'chat', id: -1005678, displayName: 'Glasses news', chatType: 'channel' },
  ]
  const unread = new Map<number, number>([[-1001234, 2]])
  const mentions = new Map<number, number>([[-1001234, 1]])
  const archived = new Set<number>()
  const messages: MessageLike[] = []
  const drafts = new Map<number, string>()
  const forwarded: string[] = []
  const viewed: string[] = []
  const ad = {
    randomId: new Uint8Array([0, 171, 16, 255]),
    title: 'A sponsor',
    message: 'Sponsored words.',
    url: 'https://t.me/sponsor',
    extra: 'not kept',
  }
  const listeners = new Set<(update: { name: string }) => void>()
  const links = new Set<(state: LinkState) => void>()
  const raws = new Set<(told: { update: { _: string } }) => void>()
  const asked: string[] = []
  const ended: number[] = []
  const used = new Set<number>()
  let ids = 0
  let losing = false
  let refused: Error | null = null
  let since = 0
  let era = 0
  const add = (chat: PeerLike, sender: PeerLike, text: string, isService = false): MessageLike => {
    const message: MessageLike = {
      id: ++serial,
      text,
      date: new Date((clock += 60_000)),
      isOutgoing: sender === me,
      isService,
      chat,
      sender,
      media: null,
      reactions: null,
      forward: null,
    }
    messages.push(message)
    return message
  }
  const peer = (id: number) => peers.find(candidate => candidate.id === id)!
  const of = (id: number) => messages.filter(message => message.chat.id === id)
  add(peers[0], peers[0], 'Hello')
  add(peers[1], peers[1], 'Build is green.')
  add(peers[1], peers[1], 'Cy joined', true)

  const client: ClientLike<number> = {
    folders: async () => [
      { id: 2, title: 'Groups', has: dialog => dialog.peer.type === 'chat' },
      { id: 3, title: 'Nobody', has: () => false },
    ],
    iterDialogs: async function* () {
      const dialogs: DialogLike[] = peers.map(entry => ({
        peer: entry,
        unreadCount: unread.get(entry.id) ?? 0,
        unreadMentionsCount: mentions.get(entry.id) ?? 0,
        isArchived: archived.has(entry.id),
        lastMessage: of(entry.id).at(-1) ?? null,
        draftMessage: drafts.has(entry.id) ? { text: drafts.get(entry.id)! } : null,
      }))
      yield* dialogs.sort((a, b) => (b.lastMessage?.date.getTime() ?? 0) - (a.lastMessage?.date.getTime() ?? 0))
    },
    getHistory: async (chat, { limit }) => of(chat).reverse().slice(0, limit),
    randomId: () => ++ids,
    sendText: async (chat, text, { randomId }) => {
      if (used.has(randomId)) throw Object.assign(new tl.RpcError(500, 'RANDOM_ID_DUPLICATE'), {})
      used.add(randomId)
      const sent = add(peer(chat), me, text)
      if (!losing) return sent
      losing = false
      throw new Error('the connection closed before the answer')
    },
    readHistory: async (chat, { clearMentions }) => {
      unread.set(chat, 0)
      if (clearMentions) mentions.set(chat, 0)
    },
    deleteMessagesById: async (chat, ids) => {
      for (const id of ids) {
        const at = messages.findIndex(message => message.chat.id === chat && message.id === id)
        if (at >= 0) messages.splice(at, 1)
      }
    },
    getPeerDialogs: async chat => [
      {
        peer: peer(chat),
        unreadCount: 0,
        unreadMentionsCount: 0,
        isArchived: false,
        lastMessage: null,
        draftMessage: drafts.has(chat) ? { text: drafts.get(chat)! } : null,
      },
    ],
    saveDraft: async (chat, draft) => void drafts.set(chat, draft.message),
    forwardMessagesById: async ({ fromChatId, messages: ids }) => {
      for (const message of of(fromChatId)) if (ids.includes(message.id)) forwarded.push(message.text)
    },
    sendReaction: async ({ chatId, message: id, emoji }) => {
      const at = messages.findIndex(message => message.chat.id === chatId && message.id === id)
      messages[at] = { ...messages[at], reactions: { reactions: [{ emoji, order: 0 }] } }
    },
    sponsoredMessages: async chat =>
      peer(chat).chatType === 'channel' ? [ad, { ...ad, randomId: new Uint8Array([9]), title: 'A second one' }] : [],
    viewSponsored: async randomId => void viewed.push(Array.from(randomId).join(',')),
    onUpdate: { add: listener => void listeners.add(listener), remove: listener => void listeners.delete(listener) },
    onConnectionState: { add: listener => void links.add(listener), remove: listener => void links.delete(listener) },
    onRawUpdate: { add: listener => void raws.add(listener), remove: listener => void raws.delete(listener) },
  }
  const answering = <A extends unknown[], R>(name: string, call: (...args: A) => Promise<R>) =>
    (async (...args: A) => {
      asked.push(name)
      if (refused) throw refused
      return call(...args)
    }) as (...args: A) => Promise<R>
  const dialogs = client.iterDialogs
  const guarded: ClientLike<number> = {
    ...client,
    iterDialogs: async function* (params) {
      asked.push('iterDialogs')
      if (refused) throw refused
      yield* dialogs(params)
    },
    folders: answering('folders', client.folders),
    getHistory: answering('getHistory', client.getHistory),
    sendText: answering('sendText', client.sendText),
    readHistory: answering('readHistory', client.readHistory),
    deleteMessagesById: answering('deleteMessagesById', client.deleteMessagesById),
    getPeerDialogs: answering('getPeerDialogs', client.getPeerDialogs),
    saveDraft: answering('saveDraft', client.saveDraft),
    forwardMessagesById: answering('forwardMessagesById', client.forwardMessagesById),
    sendReaction: answering('sendReaction', client.sendReaction),
    sponsoredMessages: answering('sponsoredMessages', client.sponsoredMessages),
    viewSponsored: answering('viewSponsored', client.viewSponsored),
  }
  const life = new Lifetime()
  return {
    client: guarded,
    asking: {
      within: answerWithin(life, ANSWER_MS),
      session: { era: () => era, ended: (at: number) => void ended.push(at) },
      now: () => since,
    },
    life,
    peers,
    add,
    forwarded,
    viewed,
    asked,
    ended,
    refuse: (error: Error | null) => void (refused = error),
    loseAnswer: () => void (losing = true),
    later: (ms: number) => void (since += ms),
    signedInAgain: () => void era++,
    archive: (entry: PeerLike) => {
      peers.push(entry)
      archived.add(entry.id)
    },
    listening: () => listeners.size + links.size + raws.size,
    raw: (name: string) => raws.forEach(listener => listener({ update: { _: name } })),
    emit: (name: string) => listeners.forEach(listener => listener({ name })),
    link: (state: LinkState) => links.forEach(listener => listener(state)),
  }
}

messengerContract('the Telegram adapter, over a client that tells nothing about the user’s own writes', async () => {
  const fake = fakeClient()
  fake.add(fake.peers[2], fake.peers[2], 'Heads Up build week has started.')
  return {
    messenger: messengerOver(fake.client, fake.asking),
    chat: '42',
    unreadChat: '-1001234',
    mentionedChat: '-1001234',
    folder: { title: 'Groups', chats: ['-1001234', '-1005678'] },
    emptyFolder: async () => 'Nobody',
    channel: '-1005678',
    saved: async () => fake.forwarded,
    sponsoredSeen: async () => fake.viewed.length,
    trouble: async next => {
      fake.refuse(next?.kind === 'wait' ? refusal('FLOOD_WAIT_%d', { seconds: next.seconds }) : null)
      if (next?.kind === 'unreachable') {
        fake.link('connecting')
        fake.later(GRACE_MS)
      } else fake.link('connected')
    },
    loseAnswer: async () => fake.loseAnswer(),
  }
})

describe('the Telegram adapter', () => {
  it('G6: gives the first sponsored message Telegram has for a channel, and tells Telegram it was seen by the id Telegram gave', async () => {
    const fake = fakeClient()
    const messenger = messengerOver(fake.client, fake.asking)
    const sponsored = await messenger.sponsored('-1005678')
    expect(sponsored).toEqual({ id: '00ab10ff', title: 'A sponsor', text: 'Sponsored words.', link: 'https://t.me/sponsor' })
    await messenger.sawSponsored(sponsored!)
    expect(fake.viewed).toEqual(['0,171,16,255'])
  })

  it('tells listeners when Telegram reports a message, an edit, a deletion or a read, and nothing else', () => {
    const fake = fakeClient()
    let told = 0
    messengerOver(fake.client, fake.asking).onChange(() => told++)
    for (const name of ['new_message', 'edit_message', 'delete_message', 'history_read', 'user_typing', 'user_status']) fake.emit(name)
    expect(told).toBe(4)
  })

  it.each([
    'updateDialogFilter',
    'updateDialogFilterOrder',
    'updateDialogFilters',
    'updateFolderPeers',
    'updateNotifySettings',
    'updateDialogUnreadMark',
    'updateReadMessagesContents',
    'updateChannelReadMessagesContents',
  ])(
    'tells listeners on %s: a folder was changed, a chat was archived, muted or marked unread, or a mention was read on another device',
    name => {
      const fake = fakeClient()
      let told = 0
      messengerOver(fake.client, fake.asking).onChange(() => told++)
      fake.raw(name)
      expect(told).toBe(1)
    },
  )

  it('tells listeners nothing for a raw update that changes no folder', () => {
    const fake = fakeClient()
    let told = 0
    messengerOver(fake.client, fake.asking).onChange(() => told++)
    for (const name of ['updateUserTyping', 'updateConfig', 'updateUserStatus']) fake.raw(name)
    expect(told).toBe(0)
  })

  it('lists an archived chat only when it is in one of the user’s folders, so a picked folder is whole', async () => {
    const fake = fakeClient()
    fake.archive({ type: 'chat', id: -1009001, displayName: 'Old project', chatType: 'supergroup' })
    fake.archive({ type: 'user', id: 77, displayName: 'Someone archived' })
    const chats = await messengerOver(fake.client, fake.asking).chats()
    const archived = chats.filter(chat => ['-1009001', '77'].includes(chat.id))
    expect(archived.map(chat => [chat.id, chat.folders.map(folder => folder.title)])).toEqual([['-1009001', ['Groups']]])
  })

  it('leaves a service notice such as "Cy joined" out of a chat’s history', async () => {
    const fake = fakeClient()
    const history = await messengerOver(fake.client, fake.asking).history('-1001234', 10)
    expect(history.map(message => message.text)).toEqual(['Build is green.'])
  })

  it('A4: does not save a draft when its caller goes while Telegram is still being asked for one', async () => {
    const fake = fakeClient()
    let answer = () => {}
    let saves = 0
    fake.client.getPeerDialogs = () => new Promise(resolve => (answer = () => resolve([null])))
    fake.client.saveDraft = async () => void saves++
    const caller = new AbortController()
    const keeping = messengerOver(fake.client, fake.asking).keep('42', 'See you at noon', caller.signal)
    caller.abort()
    answer()
    await expect(keeping).rejects.toThrow()
    expect(saves).toBe(0)
  })

  it('stops listening to the client when it is closed', () => {
    const fake = fakeClient()
    messengerOver(fake.client, fake.asking).close()
    expect(fake.listening()).toBe(0)
  })
})

describe('the Telegram adapter, when Telegram is in trouble', () => {
  const failure = async (work: Promise<unknown>) => {
    const error: unknown = await work.then(
      () => null,
      (thrown: unknown) => thrown,
    )
    return error instanceof TroubleError ? error.trouble : error
  }

  it('gives up on a call Telegram does not answer in fifteen seconds, and says it cannot be reached', async () => {
    vi.useFakeTimers()
    try {
      const fake = fakeClient()
      fake.client.getHistory = () => new Promise(() => {})
      const asked = failure(messengerOver(fake.client, fake.asking).history('42', 3))
      let settled = false
      void asked.then(() => (settled = true))
      await vi.advanceTimersByTimeAsync(ANSWER_MS - 1)
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      expect(await asked).toEqual({ kind: 'unreachable' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('takes a message back out of the line when it gives up on sending it, so it does not go out later', async () => {
    vi.useFakeTimers()
    try {
      const fake = fakeClient()
      let given: AbortSignal | undefined
      fake.client.sendText = (_chat, _text, { abortSignal }) => {
        given = abortSignal
        return new Promise((_, reject) => abortSignal.addEventListener('abort', () => reject(new Error('aborted'))))
      }
      const sending = failure(messengerOver(fake.client, fake.asking).send('42', 'Never mind'))
      await vi.advanceTimersByTimeAsync(ANSWER_MS)
      expect(await sending).toEqual({ kind: 'unreachable' })
      expect(given?.aborted).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('A4: takes a message that is still being sent out of the line when the app ends', async () => {
    const fake = fakeClient()
    let given: AbortSignal | undefined
    fake.client.sendText = (_chat, _text, { abortSignal }) => {
      given = abortSignal
      return new Promise(() => {})
    }
    void messengerOver(fake.client, fake.asking)
      .send('42', 'Closing')
      .catch(() => {})
    await Promise.resolve()
    expect(given?.aborted).toBe(false)
    fake.life.end()
    expect(given?.aborted).toBe(true)
  })

  it('A4: asks Telegram for no further page of chats once it has given up on the list', async () => {
    vi.useFakeTimers()
    try {
      const fake = fakeClient()
      let release = () => {}
      let pages = 0
      const dialogs = fake.client.iterDialogs
      fake.client.iterDialogs = async function* (params) {
        pages++
        await new Promise<void>(resolve => (release = resolve))
        for await (const dialog of dialogs(params)) {
          yield dialog
          break
        }
        pages++
        yield* dialogs(params)
      }
      const listing = failure(messengerOver(fake.client, fake.asking).chats())
      await vi.advanceTimersByTimeAsync(ANSWER_MS)
      expect(await listing).toEqual({ kind: 'unreachable' })
      release()
      await vi.advanceTimersByTimeAsync(0)
      expect(pages).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('A4: leaves no timer behind for a call that was answered', async () => {
    const fake = fakeClient()
    const before = fake.life.owned
    await messengerOver(fake.client, fake.asking).history('42', 3)
    expect(fake.life.owned).toBe(before)
  })

  it('still asks Telegram just after the connection was lost, and stops asking once it has been gone three seconds', async () => {
    const fake = fakeClient()
    const messenger = messengerOver(fake.client, fake.asking)
    fake.link('connecting')
    fake.later(GRACE_MS - 1)
    await messenger.history('42', 3)
    expect(fake.asked).toEqual(['getHistory'])
    fake.later(1)
    expect(await failure(messenger.history('42', 3))).toEqual({ kind: 'unreachable' })
    expect(await failure(messenger.send('42', 'Hello?'))).toEqual({ kind: 'unreachable' })
    expect(fake.asked).toEqual(['getHistory'])
    fake.link('connected')
    await messenger.history('42', 3)
    expect(fake.asked).toEqual(['getHistory', 'getHistory'])
  })

  it('tells listeners once when the connection is lost and once when it is back', () => {
    const fake = fakeClient()
    let told = 0
    messengerOver(fake.client, fake.asking).onChange(() => told++)
    for (const state of ['connected', 'connecting', 'connecting', 'offline'] as const) fake.link(state)
    expect(told).toBe(1)
    for (const state of ['updating', 'connected'] as const) fake.link(state)
    expect(told).toBe(2)
  })

  it('tells listeners when Telegram answers again after a call went unanswered, also if no loss of connection was reported', async () => {
    vi.useFakeTimers()
    try {
      const fake = fakeClient()
      const messenger = messengerOver(fake.client, fake.asking)
      const history = fake.client.getHistory
      fake.client.getHistory = () => new Promise(() => {})
      const unanswered = failure(messenger.history('42', 3))
      await vi.advanceTimersByTimeAsync(ANSWER_MS)
      await unanswered
      let told = 0
      messenger.onChange(() => told++)
      fake.client.getHistory = history
      await messenger.history('42', 3)
      expect(told).toBe(1)
      await messenger.history('42', 3)
      expect(told).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it.each(['FLOOD_WAIT_%d', 'SLOWMODE_WAIT_%d', 'FLOOD_PREMIUM_WAIT_%d'])('reads how long to wait from Telegram’s %s', async text => {
    const fake = fakeClient()
    fake.refuse(refusal(text, { seconds: 45 }))
    expect(await failure(messengerOver(fake.client, fake.asking).send('42', 'Again'))).toEqual({ kind: 'wait', seconds: 45 })
  })

  it.each(['AUTH_KEY_UNREGISTERED', 'AUTH_KEY_INVALID', 'SESSION_REVOKED', 'SESSION_EXPIRED', 'USER_DEACTIVATED', 'USER_DEACTIVATED_BAN'])(
    'reports the sign-in as ended when Telegram answers %s, for the sign-in the call was made under',
    async text => {
      const fake = fakeClient()
      let answer = () => {}
      fake.client.getHistory = () => new Promise((_, reject) => (answer = () => reject(refusal(text))))
      const asked = failure(messengerOver(fake.client, fake.asking).history('42', 3))
      fake.signedInAgain()
      answer()
      expect(await asked).toBeInstanceOf(tl.RpcError)
      expect(fake.ended).toEqual([0])
    },
  )

  it('does not take another refusal for an ended sign-in or for trouble', async () => {
    const fake = fakeClient()
    fake.refuse(refusal('PEER_ID_INVALID'))
    expect(await failure(messengerOver(fake.client, fake.asking).history('42', 3))).toBeInstanceOf(tl.RpcError)
    expect(fake.ended).toEqual([])
  })

  it('S4: says what kind of trouble it is and nothing of what Telegram answered', async () => {
    const fake = fakeClient()
    fake.refuse(refusal('FLOOD_WAIT_%d', { seconds: 45 }))
    const error = await messengerOver(fake.client, fake.asking)
      .send('42', 'Again')
      .catch((thrown: unknown) => thrown)
    expect((error as Error).message).toBe('wait')
    expect((error as Error).cause).toBeUndefined()
  })

  it('S5: gives a message one identity for every try of one attempt, and a new one for a new attempt', async () => {
    const fake = fakeClient()
    const given: number[] = []
    fake.client.sendText = async (_chat, _text, { randomId }) => {
      given.push(randomId)
      throw new Error('no answer')
    }
    const messenger = messengerOver(fake.client, fake.asking)
    const attempt = {}
    await messenger.send('42', 'Hello', attempt).catch(() => {})
    await messenger.send('42', 'Hello', attempt).catch(() => {})
    await messenger.send('42', 'Hello', {}).catch(() => {})
    await messenger.send('42', 'Hello').catch(() => {})
    expect(given[1]).toBe(given[0])
    expect(new Set(given).size).toBe(3)
  })

  it('S5: does not read "already used" as sent on the first try of an attempt, when nothing of it can have been sent', async () => {
    const fake = fakeClient()
    fake.client.sendText = async () => {
      throw refusal('RANDOM_ID_DUPLICATE')
    }
    expect(await failure(messengerOver(fake.client, fake.asking).send('42', 'First', {}))).toBeInstanceOf(tl.RpcError)
  })

  it('S5: keeps the identity of an attempt Telegram already has, so no later try can send it anew', async () => {
    const fake = fakeClient()
    const given: number[] = []
    const sendText = fake.client.sendText
    fake.client.sendText = async (chat, text, params) => {
      given.push(params.randomId)
      return sendText(chat, text, params)
    }
    const messenger = messengerOver(fake.client, fake.asking)
    const attempt = {}
    fake.loseAnswer()
    await messenger.send('42', 'Kept', attempt).catch(() => {})
    for (let more = 0; more < 40; more++) fake.add(fake.peers[0], fake.peers[0], `Newer ${more}`)
    expect(await messenger.send('42', 'Kept', attempt)).toBeNull()
    expect(await messenger.send('42', 'Kept', attempt)).toBeNull()
    expect(new Set(given).size).toBe(1)
    expect((await messenger.history('42', 100)).filter(message => message.text === 'Kept')).toHaveLength(1)
  })

  it('forgets the identity of an attempt once its message is sent', async () => {
    const fake = fakeClient()
    const messenger = messengerOver(fake.client, fake.asking)
    const attempt = {}
    await messenger.send('42', 'Again', attempt)
    await messenger.send('42', 'Again', attempt)
    expect((await messenger.history('42', 10)).filter(message => message.text === 'Again')).toHaveLength(2)
  })
})
