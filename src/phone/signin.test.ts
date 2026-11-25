import { Lifetime } from 'earshot'
import { describe, expect, it } from 'vitest'
import { DEMO_CODE, DEMO_NAME, DEMO_PASSWORD, demoAccount, type DemoSession } from '../demo/account.ts'
import type { Account } from '../messenger.ts'
import { SignIn } from './signin.ts'

const PHONE = '+1 555 010 0199'

function world(options: { twoStep?: boolean; signedIn?: boolean; wrap?: (account: Account) => Account } = {}) {
  const session: DemoSession = { signedIn: options.signedIn ?? false }
  const life = new Lifetime()
  const changes: boolean[] = []
  const account = demoAccount(session, options.twoStep)
  const signIn = new SignIn(life, options.wrap ? options.wrap(account) : account, signedIn => void changes.push(signedIn))
  return { signIn, session, life, changes }
}

describe('signing in on the phone', () => {
  it('asks for the number first when nobody is signed in', async () => {
    const { signIn } = world()
    expect(signIn.view().step).toBe('checking')
    expect(await signIn.start()).toBe(false)
    expect(signIn.view()).toEqual({ step: 'phone', busy: false, problem: null, name: null })
  })

  it('goes from the number to the code to signed in, and says who', async () => {
    const { signIn, changes } = world()
    await signIn.start()
    await signIn.phone(PHONE)
    expect(signIn.view().step).toBe('code')
    await signIn.code(DEMO_CODE)
    expect(signIn.view()).toEqual({ step: 'in', busy: false, problem: null, name: DEMO_NAME })
    expect(changes).toEqual([true])
  })

  it('asks for the password of an account that has one', async () => {
    const { signIn, changes } = world({ twoStep: true })
    await signIn.start()
    await signIn.phone(PHONE)
    await signIn.code(DEMO_CODE)
    expect(signIn.view().step).toBe('password')
    expect(changes).toEqual([])
    await signIn.password('wrong')
    expect(signIn.view()).toMatchObject({ step: 'password', problem: 'That password is not right.' })
    await signIn.password(DEMO_PASSWORD)
    expect(signIn.view().step).toBe('in')
    expect(changes).toEqual([true])
  })

  it('says what is wrong in plain words and stays on the step, so the user can try again', async () => {
    const { signIn } = world()
    await signIn.start()
    await signIn.phone('12')
    expect(signIn.view()).toMatchObject({ step: 'phone', problem: 'Check the number. It needs its country code, like +1.' })
    await signIn.phone(PHONE)
    await signIn.code('00000')
    expect(signIn.view()).toMatchObject({ step: 'code', problem: 'That code is not right.' })
    await signIn.code(DEMO_CODE)
    expect(signIn.view().step).toBe('in')
  })

  it('goes back to the number when the code is no longer good', async () => {
    const { signIn } = world({
      wrap: account => ({
        ...account,
        giveCode: async () => {
          const { SignInError } = await import('../messenger.ts')
          throw new SignInError('expired')
        },
      }),
    })
    await signIn.start()
    await signIn.phone(PHONE)
    await signIn.code(DEMO_CODE)
    expect(signIn.view()).toMatchObject({ step: 'phone', problem: 'That code is no longer good. Ask for a new one.' })
  })

  it('says it could not reach Telegram for a failure it does not know, never the failure’s own text', async () => {
    const { signIn } = world({
      wrap: account => ({
        ...account,
        askCode: async () => {
          throw new Error('socket hang up at 149.154.167.50')
        },
      }),
    })
    await signIn.start()
    await signIn.phone(PHONE)
    expect(signIn.view()).toMatchObject({ step: 'phone', problem: 'Could not reach Telegram. Try again.' })
  })

  it('takes one answer at a time: a second press while Telegram is asked does nothing', async () => {
    let asked = 0
    const { signIn } = world({
      wrap: account => ({
        ...account,
        askCode: async phone => {
          asked++
          await account.askCode(phone)
        },
      }),
    })
    await signIn.start()
    const first = signIn.phone(PHONE)
    expect(signIn.view().busy).toBe(true)
    await signIn.phone(PHONE)
    await first
    expect(asked).toBe(1)
    expect(signIn.view().step).toBe('code')
  })

  it('A5: lets the user go back to the number, and ignores the answer to the code they left', async () => {
    let release = () => {}
    const { signIn, changes } = world({
      wrap: account => ({
        ...account,
        giveCode: async code => {
          await new Promise<void>(resolve => (release = resolve))
          return account.giveCode(code)
        },
      }),
    })
    await signIn.start()
    await signIn.phone(PHONE)
    const checking = signIn.code(DEMO_CODE)
    signIn.another()
    expect(signIn.view()).toEqual({ step: 'phone', busy: false, problem: null, name: null })
    release()
    await checking
    expect(signIn.view().step).toBe('phone')
    expect(changes).toEqual([])
  })

  it('is signed in at once on the next launch', async () => {
    const { signIn, changes } = world({ signedIn: true })
    expect(await signIn.start()).toBe(true)
    expect(signIn.view()).toMatchObject({ step: 'in', name: DEMO_NAME })
    expect(changes).toEqual([])
  })

  it('does not ask a signed-in user for their number when Telegram cannot be reached at launch: it offers to try again', async () => {
    let online = false
    const { signIn, changes } = world({
      signedIn: true,
      wrap: account => ({
        ...account,
        restore: async () => {
          if (!online) throw new Error('offline')
          return account.restore()
        },
      }),
    })
    expect(await signIn.start()).toBe(false)
    expect(signIn.view()).toMatchObject({ step: 'offline', problem: 'Could not reach Telegram. Try again.' })
    await signIn.phone(PHONE)
    expect(signIn.view().step).toBe('offline')
    online = true
    await signIn.retry()
    expect(signIn.view()).toMatchObject({ step: 'in', name: DEMO_NAME })
    expect(changes).toEqual([true])
  })

  it('signs out, and asks for the number again', async () => {
    const { signIn, session, changes } = world({ signedIn: true })
    await signIn.start()
    await signIn.signOut()
    expect(session.signedIn).toBe(false)
    expect(signIn.view().step).toBe('phone')
    expect(changes).toEqual([false])
  })

  it('signs out on this phone also when Telegram cannot be told, and says what is left to do', async () => {
    const { signIn, changes } = world({
      signedIn: true,
      wrap: account => ({
        ...account,
        signOut: async () => {
          throw new Error('offline')
        },
      }),
    })
    await signIn.start()
    await signIn.signOut()
    expect(signIn.view()).toMatchObject({
      step: 'phone',
      problem: 'Signed out on this phone. Telegram could not be told: end this session in Telegram, under Devices.',
    })
    expect(changes).toEqual([false])
  })

  it('A4: changes nothing once the app has ended', async () => {
    const { signIn, life, changes } = world()
    await signIn.start()
    await signIn.phone(PHONE)
    life.end()
    await signIn.code(DEMO_CODE)
    expect(changes).toEqual([])
  })
})
