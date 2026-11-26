import { accountContract } from '../account.contract.ts'
import { DEMO_CODE, DEMO_PASSWORD, demoAccount, type DemoSession } from './account.ts'

for (const twoStep of [false, true]) {
  accountContract(`the sample account${twoStep ? ' with a password' : ''}`, async () => {
    const session: DemoSession = { signedIn: false }
    const account = demoAccount(session, twoStep)
    return {
      account,
      endElsewhere: async () => account.endElsewhere(),
      again: () => demoAccount(session, twoStep),
      phone: '+1 555 010 0199',
      badPhone: '12',
      code: DEMO_CODE,
      badCode: '00000',
      password: twoStep ? DEMO_PASSWORD : null,
      badPassword: 'wrong',
    }
  })
}
