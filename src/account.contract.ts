import { describe, expect, it } from 'vitest'
import { SignInError, type Account } from './messenger.ts'

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

const problem = async (work: Promise<unknown>) => {
  try {
    await work
    return 'none'
  } catch (error) {
    return error instanceof SignInError ? error.problem : `not a SignInError: ${String(error)}`
  }
}

async function enter(world: AccountWorld): Promise<string> {
  await world.account.askCode(world.phone)
  const step = await world.account.giveCode(world.code)
  if (step !== 'password') return step.name
  if (world.password === null) throw new Error('This account wants a password and the world has none')
  return (await world.account.givePassword(world.password)).name
}

export function accountContract(name: string, make: () => Promise<AccountWorld>): void {
  describe(`A6: ${name} keeps the account contract`, () => {
    it('is signed out until someone signs in', async () => {
      const { account } = await make()
      expect(await account.restore()).toBeNull()
    })

    it('says so when the number is not one Telegram knows how to reach', async () => {
      const { account, badPhone } = await make()
      expect(await problem(account.askCode(badPhone))).toBe('phone')
    })

    it('refuses a wrong code, and still takes the right one after it', async () => {
      const world = await make()
      await world.account.askCode(world.phone)
      expect(await problem(world.account.giveCode(world.badCode))).toBe('code')
      const step = await world.account.giveCode(world.code)
      expect(step === 'password' || step.name.length > 0).toBe(true)
    })

    it('takes no code before one was asked for', async () => {
      const { account, code } = await make()
      expect(await problem(account.giveCode(code))).toBe('expired')
    })

    it('asks for the password of an account that has one, and refuses a wrong one', async () => {
      const world = await make()
      if (world.password === null) return
      await world.account.askCode(world.phone)
      expect(await world.account.giveCode(world.code)).toBe('password')
      expect(await problem(world.account.givePassword(world.badPassword))).toBe('password')
      expect((await world.account.givePassword(world.password)).name.length).toBeGreaterThan(0)
    })

    it('stays signed in for the next launch, with the name of the account', async () => {
      const world = await make()
      const name = await enter(world)
      expect(await world.again().restore()).toBe(name)
    })

    it('is signed out for the next launch after signing out', async () => {
      const world = await make()
      await enter(world)
      await world.account.signOut()
      expect(await world.again().restore()).toBeNull()
    })
  })
}
