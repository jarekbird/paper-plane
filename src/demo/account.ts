import { SignInError, type Account } from '../messenger.ts'

export const DEMO_CODE = '12345'
export const DEMO_PASSWORD = 'paper plane'
export const DEMO_NAME = 'Sample account'

export interface DemoSession {
  signedIn: boolean
}

export function demoAccount(session: DemoSession, twoStep = false): Account {
  let asked = false
  let needsPassword = false
  const enter = () => {
    asked = false
    needsPassword = false
    session.signedIn = true
    return { name: DEMO_NAME }
  }
  return {
    restore: async () => (session.signedIn ? DEMO_NAME : null),
    askCode: async phone => {
      if (phone.replace(/\D/g, '').length < 8) throw new SignInError('phone')
      asked = true
    },
    giveCode: async code => {
      if (!asked) throw new SignInError('expired')
      if (code !== DEMO_CODE) throw new SignInError('code')
      if (!twoStep) return enter()
      needsPassword = true
      return 'password'
    },
    givePassword: async password => {
      if (!needsPassword) throw new SignInError('expired')
      if (password !== DEMO_PASSWORD) throw new SignInError('password')
      return enter()
    },
    signOut: async () => {
      session.signedIn = false
    },
  }
}
