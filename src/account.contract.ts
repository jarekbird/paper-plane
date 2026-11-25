import { describe, expect, it } from 'vitest'
import { SignInError, type Account, type Who } from './messenger.ts'

export interface AccountWorld {
  account: Account
  again(): Account
  phone: string
  badPhone: string
  code: string
  badCode: string
  password: string | null
  badPassword: string
}

const live = () => new AbortController().signal
const gone = () => {
  const left = new AbortController()
  left.abort()
  return left.signal
}

const problem = async (work: Promise<unknown>) => {
  try {
    await work
    return 'none'
  } catch (error) {
    return error instanceof SignInError ? error.problem : `not a SignInError: ${String(error)}`
  }
}

async function enter(world: AccountWorld): Promise<Who> {
  await world.account.askCode(world.phone, live())
  const step = await world.account.giveCode(world.code, live())
  if (step !== 'password') return step
  if (world.password === null) throw new Error('This account wants a password and the world has none')
  return world.account.givePassword(world.password, live())
}

export function accountContract(name: string, make: () => Promise<AccountWorld>): void {
  describe(`A6: ${name} keeps the account contract`, () => {
    it('is signed out, and knows of no sign-in, until someone signs in', async () => {
      const { account } = await make()
      expect(await account.known()).toBe(false)
      expect(await account.restore()).toBeNull()
    })

    it('says so when the number is not one Telegram knows how to reach', async () => {
      const { account, badPhone } = await make()
      expect(await problem(account.askCode(badPhone, live()))).toBe('phone')
    })

    it('refuses a wrong code, and still takes the right one after it', async () => {
      const world = await make()
      expect(await world.account.askCode(world.phone, live())).toBe('code')
      expect(await problem(world.account.giveCode(world.badCode, live()))).toBe('code')
      const step = await world.account.giveCode(world.code, live())
      expect(step === 'password' || step.name.length > 0).toBe(true)
    })

    it('takes no code before one was asked for', async () => {
      const { account, code } = await make()
      expect(await problem(account.giveCode(code, live()))).toBe('expired')
    })

    it('asks for the password of an account that has one, and refuses a wrong one', async () => {
      const world = await make()
      if (world.password === null) return
      await world.account.askCode(world.phone, live())
      expect(await world.account.giveCode(world.code, live())).toBe('password')
      expect(await problem(world.account.givePassword(world.badPassword, live()))).toBe('password')
      expect((await world.account.givePassword(world.password, live())).name.length).toBeGreaterThan(0)
    })

    it('stays signed in for the next launch, as the same account', async () => {
      const world = await make()
      const who = await enter(world)
      expect(who.id.length).toBeGreaterThan(0)
      expect(await world.again().known()).toBe(true)
      expect(await world.again().restore()).toEqual(who)
    })

    it('is signed out for the next launch after signing out, and says Telegram was told', async () => {
      const world = await make()
      await enter(world)
      expect(await world.account.signOut()).toBe('told')
      expect(await world.again().known()).toBe(false)
      expect(await world.again().restore()).toBeNull()
    })

    it('A5: signs nobody in for an attempt the user has left', async () => {
      const world = await make()
      await world.account.askCode(world.phone, live())
      await world.account.giveCode(world.code, gone()).catch(() => {})
      expect(await world.again().known()).toBe(false)
      expect(await world.again().restore()).toBeNull()
    })
  })
}
