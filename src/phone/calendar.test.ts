import { Lifetime } from 'earshot'
import { describe, expect, it } from 'vitest'
import { DEMO_PAIR_CODE, demoCalendarAccount } from '../demo/calendar-account.ts'
import type { CalendarAccount } from '../messenger.ts'
import { Connect } from './calendar.ts'

function world(options: { connected?: boolean; wrap?: (account: CalendarAccount) => CalendarAccount } = {}) {
  const session = { connected: options.connected ?? false }
  const life = new Lifetime()
  const account = demoCalendarAccount(session)
  const connect = new Connect(life, options.wrap ? options.wrap(account) : account)
  return { connect, account, session, life }
}

describe('connecting Google Calendar on the phone', () => {
  it('offers to connect when nothing is connected', async () => {
    const { connect } = world()
    expect(connect.view().step).toBe('checking')
    await connect.start()
    expect(connect.view()).toEqual({ step: 'off', busy: false, link: null, problem: null })
  })

  it('gives the page to open, then takes the code from that page, and is connected', async () => {
    const { connect, session } = world()
    await connect.start()
    await connect.begin()
    expect(connect.view()).toMatchObject({ step: 'code', link: 'demo://local' })
    await connect.code(DEMO_PAIR_CODE)
    expect(connect.view()).toEqual({ step: 'on', busy: false, link: null, problem: null })
    expect(session.connected).toBe(true)
  })

  it('says a wrong code is wrong and starts over, since the relay keeps nothing for a second try', async () => {
    const { connect } = world()
    await connect.start()
    await connect.begin()
    await connect.code('000000')
    expect(connect.view()).toMatchObject({ step: 'off', link: null })
    expect(connect.view().problem).toMatch(/not right/)
    await connect.begin()
    await connect.code(DEMO_PAIR_CODE)
    expect(connect.view().step).toBe('on')
  })

  it('goes back when the user gives up on the code', async () => {
    const { connect } = world()
    await connect.start()
    await connect.begin()
    connect.cancel()
    expect(connect.view()).toEqual({ step: 'off', busy: false, link: null, problem: null })
  })

  it('disconnects, and offers to connect again', async () => {
    const { connect, session } = world({ connected: true })
    await connect.start()
    expect(connect.view().step).toBe('on')
    await connect.disconnect()
    expect(connect.view().step).toBe('off')
    expect(session.connected).toBe(false)
  })

  it('shows that the calendar is no longer connected when Google ended the sign-in', async () => {
    const { connect, account } = world({ connected: true })
    await connect.start()
    await account.signOut()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(connect.view().step).toBe('off')
  })

  it('keeps the code step, and says so, when the relay cannot be reached', async () => {
    const { connect } = world({
      wrap: account => ({
        ...account,
        finish: async () => {
          throw new Error('offline')
        },
      }),
    })
    await connect.start()
    await connect.begin()
    await connect.code(DEMO_PAIR_CODE)
    expect(connect.view()).toMatchObject({ step: 'code', link: 'demo://local' })
    expect(connect.view().problem).toMatch(/relay/)
  })

  it('A4: listens to nothing once the app has ended', async () => {
    const { connect, account, life } = world({ connected: true })
    await connect.start()
    let told = 0
    connect.onChange(() => told++)
    life.end()
    await account.signOut()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(told).toBe(0)
  })

  it('says so, and stays connected, when the phone could not disconnect', async () => {
    const { connect } = world({
      connected: true,
      wrap: account => ({
        ...account,
        signOut: async () => {
          throw new Error('the store is full')
        },
      }),
    })
    await connect.start()
    await connect.disconnect()
    expect(connect.view()).toMatchObject({ step: 'on', busy: false })
    expect(connect.view().problem).toMatch(/Could not disconnect/)
  })

  it('says what is left to do when the calendar is off this phone but the sign-in could not be ended everywhere', async () => {
    const { connect } = world({
      connected: true,
      wrap: account => ({
        ...account,
        signOut: async () => {
          await account.signOut()
          return 'here'
        },
      }),
    })
    await connect.start()
    await connect.disconnect()
    expect(connect.view().step).toBe('off')
    expect(connect.view().problem).toMatch(/End it in your Google account/)
  })

  it('S3: says the calendar is connected, and how to undo it, when the user cancelled but the connection could not be undone', async () => {
    let answer = () => {}
    const { connect, session } = world({
      wrap: account => ({
        ...account,
        finish: async () => {
          await new Promise<void>(resolve => (answer = resolve))
          session.connected = true
          return true
        },
      }),
    })
    await connect.start()
    await connect.begin()
    const typing = connect.code(DEMO_PAIR_CODE)
    connect.cancel()
    expect(connect.view().step).toBe('off')
    answer()
    await typing
    expect(connect.view().step).toBe('on')
    expect(connect.view().problem).toMatch(/could not be undone.*Disconnect if you did not mean to/)
    await connect.start()
    expect(connect.view().problem).toMatch(/could not be undone/)
  })
})
