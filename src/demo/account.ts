import { SignInError, type Account, type Who } from '../messenger.ts'

export const DEMO_CODE = '12345'
export const DEMO_PASSWORD = 'paper plane'
export const DEMO_WHO: Who = { id: 'sample-user', name: 'Sample account' }

export interface DemoSession {
  signedIn: boolean
}

export function demoAccount(session: DemoSession, twoStep = false, who: Who = DEMO_WHO): Account {
  let asked = false
  let needsPassword = false
  const enter = (signal: AbortSignal) => {
    signal.throwIfAborted()
    asked = false
    needsPassword = false
    session.signedIn = true
    return who
  }
  return {
    known: async () => session.signedIn,
    restore: async () => (session.signedIn ? who : null),
    askCode: async phone => {
      if (phone.replace(/\D/g, '').length < 8) throw new SignInError('phone')
      asked = true
      return 'code'
    },
    giveCode: async (code, signal) => {
      if (!asked) throw new SignInError('expired')
      if (code !== DEMO_CODE) throw new SignInError('code')
      if (!twoStep) return enter(signal)
      needsPassword = true
      return 'password'
    },
    givePassword: async (password, signal) => {
      if (!needsPassword) throw new SignInError('expired')
      if (password !== DEMO_PASSWORD) throw new SignInError('password')
      return enter(signal)
    },
    signOut: async () => {
      session.signedIn = false
      return 'told'
    },
  }
}
