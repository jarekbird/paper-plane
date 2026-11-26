import { Lifetime } from 'earshot'
import { tl } from '@mtcute/core'
import { describe, expect, it, vi } from 'vitest'
import { accountContract } from '../account.contract.ts'
import { SignInError, TroubleError } from '../messenger.ts'
import { accountOver, type AuthClientLike, type SessionPlace } from './account.ts'

const PHONE = '+15550100199'
const CODE = '24680'
const PASSWORD = 'correct horse'
const NAME = 'Anna Lee'
const ME = { id: 4242, displayName: NAME }
const live = () => new AbortController().signal
const turn = () => new Promise<void>(resolve => setTimeout(resolve, 0))
const refuse = (text: string): never => {
  throw new tl.RpcError(400, text as never)
}

function telegramSide(twoStep: boolean) {
  const sessions = new Set<string>()
  let issued = 0
  const client = (): AuthClientLike & { loops: number; drops: number } => {
    let session: string | null = null
    let codeFor: string | null = null
    let passwordDue = false
    const open = () => {
      session = `session-${++issued}`
      sessions.add(session)
      return ME
    }
    const self = {
      loops: 0,
      drops: 0,
      drop: async () => {
        self.drops++
        session = null
      },
      sendCode: async ({ phone }: { phone: string }) => {
        if (phone !== PHONE) refuse('PHONE_NUMBER_INVALID')
        codeFor = phone
        return { phoneCodeHash: 'hash-1' }
      },
      signIn: async ({ phone, phoneCodeHash, phoneCode }: { phone: string; phoneCodeHash: string; phoneCode: string }) => {
        if (codeFor !== phone || phoneCodeHash !== 'hash-1') refuse('PHONE_CODE_EXPIRED')
        if (phoneCode !== CODE) refuse('PHONE_CODE_INVALID')
        if (!twoStep) return open()
        passwordDue = true
        return refuse('SESSION_PASSWORD_NEEDED')
      },
      checkPassword: async (password: string) => {
        if (!passwordDue || password !== PASSWORD) refuse('PASSWORD_HASH_INVALID')
        return open()
      },
      logOut: async () => {
        if (session) sessions.delete(session)
        session = null
      },
      getMe: async () => (session && sessions.has(session) ? ME : refuse('AUTH_KEY_UNREGISTERED')),
      exportSession: async () => session ?? refuse('AUTH_KEY_UNREGISTERED'),
      importSession: async (saved: string) => void (session = saved),
      startUpdatesLoop: async () => void self.loops++,
    }
    return self
  }
  return { client, revokeAll: () => sessions.clear(), open: () => sessions.size }
}

function world(twoStep: boolean) {
  const side = telegramSide(twoStep)
  let saved: string | null = null
  const place: SessionPlace = { load: async () => saved, save: async session => void (saved = session) }
  const first = side.client()
  return { side, place, first, saved: () => saved, account: accountOver(new Lifetime(), first, place) }
}

for (const twoStep of [false, true]) {
  accountContract(`the Telegram account${twoStep ? ' with a password' : ''}, over a stand-in client`, async () => {
    const made = world(twoStep)
    return {
      account: made.account,
      endElsewhere: async () => {
        made.side.revokeAll()
        made.account.ended(made.account.era())
        await turn()
      },
      again: () => accountOver(new Lifetime(), made.side.client(), made.place),
      phone: PHONE,
      badPhone: '12',
      code: CODE,
      badCode: '00000',
      password: twoStep ? PASSWORD : null,
      badPassword: 'wrong',
    }
  })
}

describe('the Telegram account', () => {
  it('keeps the sign-in on the phone, and starts listening for messages once in', async () => {
    const made = world(false)
    await made.account.askCode(PHONE, live())
    expect(await made.account.giveCode(CODE, live())).toEqual({ id: '4242', name: NAME })
    expect(made.saved()).toMatch(/^session-/)
    expect(made.first.loops).toBe(1)
  })

  it('forgets a sign-in that was ended from another device, and is signed out', async () => {
    const made = world(false)
    await made.account.askCode(PHONE, live())
    await made.account.giveCode(CODE, live())
    made.side.revokeAll()
    expect(await accountOver(new Lifetime(), made.side.client(), made.place).restore()).toBeNull()
    expect(made.saved()).toBeNull()
  })

  it('A5: ends the session again when the user left the attempt while Telegram was answering', async () => {
    const made = world(false)
    const signIn = made.first.signIn
    let answer = () => {}
    made.first.signIn = async params => {
      await new Promise<void>(resolve => (answer = resolve))
      return signIn(params)
    }
    await made.account.askCode(PHONE, live())
    const left = new AbortController()
    const attempt = made.account.giveCode(CODE, left.signal).catch(() => 'left')
    left.abort()
    answer()
    expect(await attempt).toBe('left')
    expect(made.saved()).toBeNull()
    expect(made.side.open()).toBe(0)
    expect(made.first.loops).toBe(0)
  })

  it.each(['exportSession', 'startUpdatesLoop'] as const)(
    'A5: keeps nothing when the user leaves while %s is still running',
    async step => {
      const made = world(false)
      const real = made.first[step].bind(made.first)
      let answer = () => {}
      made.first[step] = (async () => {
        await new Promise<void>(resolve => (answer = resolve))
        return real()
      }) as never
      await made.account.askCode(PHONE, live())
      const left = new AbortController()
      const attempt = made.account.giveCode(CODE, left.signal).catch(() => 'left')
      await Promise.resolve()
      await new Promise(resolve => setTimeout(resolve, 0))
      left.abort()
      answer()
      expect(await attempt).toBe('left')
      expect(made.saved()).toBeNull()
      expect(made.side.open()).toBe(0)
    },
  )

  it('A5: keeps nothing when the user leaves while the sign-in is being stored', async () => {
    const side = telegramSide(false)
    let saved: string | null = null
    let stored = () => {}
    const place: SessionPlace = {
      load: async () => saved,
      save: async session => {
        if (session !== null) await new Promise<void>(resolve => (stored = resolve))
        saved = session
      },
    }
    const account = accountOver(new Lifetime(), side.client(), place)
    await account.askCode(PHONE, live())
    const left = new AbortController()
    const attempt = account.giveCode(CODE, left.signal).catch(() => 'left')
    await new Promise(resolve => setTimeout(resolve, 0))
    left.abort()
    stored()
    expect(await attempt).toBe('left')
    expect(saved).toBeNull()
    expect(side.open()).toBe(0)
  })

  it('counts as signed out when Telegram ended the session, even if the phone could not forget it', async () => {
    const side = telegramSide(false)
    let saved: string | null = null
    let broken = false
    const place: SessionPlace = {
      load: async () => saved,
      save: async session => {
        if (broken) throw new Error('storage is full')
        saved = session
      },
    }
    const account = accountOver(new Lifetime(), side.client(), place)
    await account.askCode(PHONE, live())
    await account.giveCode(CODE, live())
    broken = true
    expect(await account.signOut()).toBe('told')
    broken = false
    expect(await accountOver(new Lifetime(), side.client(), place).restore()).toBeNull()
  })

  it.each(['exportSession', 'startUpdatesLoop'] as const)(
    'leaves nobody signed in when %s fails after Telegram took the code',
    async step => {
      const made = world(false)
      made.first[step] = (async () => refuse('NETWORK_DOWN')) as never
      await made.account.askCode(PHONE, live())
      const failed = await made.account.giveCode(CODE, live()).catch(error => error)
      expect(failed).toBeInstanceOf(SignInError)
      expect(failed.problem).toBe('other')
      expect(made.saved()).toBeNull()
      expect(made.side.open()).toBe(0)
    },
  )

  it('S5: says the user is signed in when a failed sign-in could not be undone, since the sign-in is still there', async () => {
    const side = telegramSide(false)
    let saved: string | null = null
    let stuck = false
    const place: SessionPlace = {
      load: async () => saved,
      save: async session => {
        if (stuck && session === null) throw new Error('storage is full')
        saved = session
      },
    }
    const first = side.client()
    first.startUpdatesLoop = async () => refuse('NETWORK_DOWN')
    first.logOut = async () => refuse('NETWORK_DOWN')
    const account = accountOver(new Lifetime(), first, place)
    await account.askCode(PHONE, live())
    stuck = true
    expect(await account.giveCode(CODE, live())).toEqual({ id: '4242', name: NAME })
    expect(saved).toMatch(/^session-/)
  })

  it('S5: answers with the signed-in user, not silence, when an attempt the user left could not be undone', async () => {
    const side = telegramSide(false)
    let saved: string | null = null
    let stuck = false
    const place: SessionPlace = {
      load: async () => saved,
      save: async session => {
        if (stuck && session === null) throw new Error('storage is full')
        saved = session
      },
    }
    const first = side.client()
    first.logOut = async () => refuse('NETWORK_DOWN')
    let answer = () => {}
    const start = first.startUpdatesLoop.bind(first)
    first.startUpdatesLoop = async () => {
      await new Promise<void>(resolve => (answer = resolve))
      return start()
    }
    const account = accountOver(new Lifetime(), first, place)
    await account.askCode(PHONE, live())
    const left = new AbortController()
    const attempt = account.giveCode(CODE, left.signal)
    await new Promise(resolve => setTimeout(resolve, 0))
    stuck = true
    left.abort()
    answer()
    expect(await attempt).toEqual({ id: '4242', name: NAME })
  })

  it('A5: undoes the sign-in when the user leaves and the step that was running then fails', async () => {
    const made = world(false)
    let fail = () => {}
    made.first.startUpdatesLoop = () => new Promise<void>((_, reject) => (fail = () => reject(new Error('socket closed'))))
    await made.account.askCode(PHONE, live())
    const left = new AbortController()
    const attempt = made.account.giveCode(CODE, left.signal).catch(() => 'left')
    await new Promise(resolve => setTimeout(resolve, 0))
    left.abort()
    fail()
    expect(await attempt).toBe('left')
    expect(made.saved()).toBeNull()
    expect(made.side.open()).toBe(0)
  })

  it('signs the user in when Telegram needs no code for this number', async () => {
    const made = world(false)
    made.first.sendCode = async () => ME
    made.first.exportSession = async () => 'session-direct'
    expect(await made.account.askCode(PHONE, live())).toEqual({ id: '4242', name: NAME })
    expect(made.saved()).not.toBeNull()
    expect(made.first.loops).toBe(1)
  })

  it('A4: drops the signed-in connection when sign-out could not tell Telegram, so nothing keeps listening', async () => {
    const made = world(false)
    await made.account.askCode(PHONE, live())
    await made.account.giveCode(CODE, live())
    made.first.logOut = async () => refuse('NETWORK_DOWN')
    expect(await made.account.signOut()).toBe('untold')
    expect(made.first.drops).toBe(1)
    await expect(made.first.getMe()).rejects.toThrow()
  })

  it('keeps the connection, now signed out, when Telegram ended the session itself', async () => {
    const made = world(false)
    await made.account.askCode(PHONE, live())
    await made.account.giveCode(CODE, live())
    expect(await made.account.signOut()).toBe('told')
    expect(made.first.drops).toBe(0)
  })

  it('A4: drops the signed-in connection when an undone sign-in could not be ended at Telegram', async () => {
    const made = world(false)
    made.first.startUpdatesLoop = async () => refuse('NETWORK_DOWN')
    made.first.logOut = async () => refuse('NETWORK_DOWN')
    await made.account.askCode(PHONE, live())
    await made.account.giveCode(CODE, live()).catch(() => {})
    expect(made.saved()).toBeNull()
    expect(made.first.drops).toBe(1)
  })

  it('says Telegram was not told when sign-out cannot reach it, with the sign-in already gone from the phone', async () => {
    const made = world(false)
    await made.account.askCode(PHONE, live())
    await made.account.giveCode(CODE, live())
    made.first.logOut = async () => refuse('NETWORK_DOWN')
    expect(await made.account.signOut()).toBe('untold')
    expect(made.saved()).toBeNull()
  })

  it('does not claim a sign-out when the sign-in could not be removed from the phone and Telegram could not be told', async () => {
    const side = telegramSide(false)
    let saved: string | null = null
    let broken = false
    const place: SessionPlace = {
      load: async () => saved,
      save: async session => {
        if (broken) throw new Error('storage is full')
        saved = session
      },
    }
    const first = side.client()
    const account = accountOver(new Lifetime(), first, place)
    await account.askCode(PHONE, live())
    await account.giveCode(CODE, live())
    broken = true
    first.logOut = async () => refuse('NETWORK_DOWN')
    await expect(account.signOut()).rejects.toThrow()
    expect(await accountOver(new Lifetime(), side.client(), place).restore()).toEqual({ id: '4242', name: NAME })
  })

  it('S4: tells the user what is wrong without passing on Telegram’s own error', async () => {
    const made = world(false)
    const failed = await made.account.askCode('12', live()).catch(error => error)
    expect(failed).toBeInstanceOf(SignInError)
    expect(String(failed.message)).toBe('phone')
  })

  it('A4: writes no sign-in once the app has ended', async () => {
    const side = telegramSide(false)
    let saved: string | null = null
    const life = new Lifetime()
    const account = accountOver(life, side.client(), { load: async () => saved, save: async session => void (saved = session) })
    await account.askCode(PHONE, live())
    life.end()
    await account.giveCode(CODE, live()).catch(() => {})
    expect(saved).toBeNull()
  })

  it('forgets a sign-in Telegram ended while the app was running, and drops its connection so nothing keeps asking under it', async () => {
    const made = world(false)
    await made.account.askCode(PHONE, live())
    await made.account.giveCode(CODE, live())
    let told = 0
    made.account.onEnded(() => told++)
    made.side.revokeAll()
    made.account.ended(made.account.era())
    await turn()
    expect(told).toBe(1)
    expect(made.saved()).toBeNull()
    expect(made.first.drops).toBe(1)
  })

  it('A5: does not end a new sign-in on a late answer to a call made under an earlier one', async () => {
    const made = world(false)
    await made.account.askCode(PHONE, live())
    await made.account.giveCode(CODE, live())
    const earlier = made.account.era()
    await made.account.signOut()
    await made.account.askCode(PHONE, live())
    await made.account.giveCode(CODE, live())
    let told = 0
    made.account.onEnded(() => told++)
    made.account.ended(earlier)
    await turn()
    expect(told).toBe(0)
    expect(made.saved()).toMatch(/^session-/)
    expect(made.first.drops).toBe(0)
  })

  it('notices an ended sign-in after a launch that restored it', async () => {
    const made = world(false)
    await made.account.askCode(PHONE, live())
    await made.account.giveCode(CODE, live())
    const next = accountOver(new Lifetime(), made.side.client(), made.place)
    await next.restore()
    let told = 0
    next.onEnded(() => told++)
    next.ended(next.era())
    await turn()
    expect(told).toBe(1)
    expect(made.saved()).toBeNull()
  })

  it('is not ended before anyone signed in', async () => {
    const made = world(false)
    let told = 0
    made.account.onEnded(() => told++)
    made.account.ended(made.account.era())
    await turn()
    expect(told).toBe(0)
    expect(made.first.drops).toBe(0)
  })

  it('gives up asking for a code when Telegram does not answer in fifteen seconds, so the user can try again', async () => {
    vi.useFakeTimers()
    try {
      const made = world(false)
      const sendCode = made.first.sendCode
      made.first.sendCode = () => new Promise(() => {})
      const asking = made.account.askCode(PHONE, live()).catch((error: unknown) => error)
      await vi.advanceTimersByTimeAsync(15_000)
      expect(await asking).toMatchObject({ problem: 'other' })
      made.first.sendCode = sendCode
      expect(await made.account.askCode(PHONE, live())).toBe('code')
      expect(await made.account.giveCode(CODE, live())).toEqual({ id: '4242', name: NAME })
    } finally {
      vi.useRealTimers()
    }
  })

  it('gives up restoring a sign-in when Telegram does not answer in fifteen seconds, and keeps the sign-in for the next try', async () => {
    vi.useFakeTimers()
    try {
      const made = world(false)
      await made.account.askCode(PHONE, live())
      await made.account.giveCode(CODE, live())
      const silent = made.side.client()
      let answer = () => {}
      const getMe = silent.getMe
      silent.getMe = () => new Promise(resolve => (answer = () => resolve(getMe())))
      const restoring = accountOver(new Lifetime(), silent, made.place)
        .restore()
        .catch((error: unknown) => error)
      await vi.advanceTimersByTimeAsync(14_999)
      expect(silent.loops).toBe(0)
      await vi.advanceTimersByTimeAsync(1)
      const failure = await restoring
      expect(failure).toBeInstanceOf(TroubleError)
      expect((failure as TroubleError).trouble).toEqual({ kind: 'unreachable' })
      expect(made.saved()).toMatch(/^session-/)
      answer()
      await vi.advanceTimersByTimeAsync(0)
      expect(silent.loops).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})
