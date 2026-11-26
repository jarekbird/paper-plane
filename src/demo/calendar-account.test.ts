import { calendarAccountContract } from '../calendar-account.contract.ts'
import { DEMO_PAIR_CODE, demoCalendarAccount } from './calendar-account.ts'

calendarAccountContract('the sample calendar sign-in', async () => ({
  account: demoCalendarAccount({ connected: false }),
  signInAt: async () => DEMO_PAIR_CODE,
  wrongCode: '000000',
}))
