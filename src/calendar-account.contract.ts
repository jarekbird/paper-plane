import { describe, expect, it } from 'vitest'
import type { CalendarAccount } from './messenger.ts'

export interface CalendarAccountWorld {
  account: CalendarAccount
  signInAt(link: string): Promise<string>
  wrongCode: string
}

const live = () => new AbortController().signal

async function connect(world: CalendarAccountWorld): Promise<boolean> {
  return world.account.finish(await world.signInAt(await world.account.begin()), live())
}

export function calendarAccountContract(name: string, make: () => Promise<CalendarAccountWorld>): void {
  describe(`A6: ${name} keeps the contract for connecting a calendar`, () => {
    it('is not connected until the user connects it', async () => {
      const { account } = await make()
      expect(await account.known()).toBe(false)
    })

    it('gives a page to sign in at, and is connected by the code from that page, telling its listeners once', async () => {
      const world = await make()
      let told = 0
      const stop = world.account.onChange(() => told++)
      const link = await world.account.begin()
      expect(link.length).toBeGreaterThan(0)
      expect(await world.account.finish(await world.signInAt(link), live())).toBe(true)
      expect(await world.account.known()).toBe(true)
      expect(told).toBe(1)
      stop()
    })

    it('is not connected by a wrong code, which also uses the sign-in up: the right code no longer works, a new start does', async () => {
      const world = await make()
      const code = await world.signInAt(await world.account.begin())
      expect(await world.account.finish(world.wrongCode, live())).toBe(false)
      expect(await world.account.finish(code, live())).toBe(false)
      expect(await world.account.known()).toBe(false)
      expect(await connect(world)).toBe(true)
    })

    it('takes no code before a sign-in was started', async () => {
      const world = await make()
      expect(await world.account.finish(world.wrongCode, live())).toBe(false)
      expect(await world.account.known()).toBe(false)
    })

    it('A5: connects nothing for a user who has already left the step', async () => {
      const world = await make()
      const code = await world.signInAt(await world.account.begin())
      const gone = new AbortController()
      gone.abort()
      await expect(world.account.finish(code, gone.signal)).rejects.toThrow()
      expect(await world.account.known()).toBe(false)
    })

    it('A5: connects nothing for a user who leaves the step while the code is being taken', async () => {
      const world = await make()
      const code = await world.signInAt(await world.account.begin())
      let told = 0
      const stop = world.account.onChange(() => told++)
      const leaving = new AbortController()
      const finishing = world.account.finish(code, leaving.signal)
      leaving.abort()
      await expect(finishing).rejects.toThrow()
      expect(await world.account.known()).toBe(false)
      expect(told).toBe(0)
      stop()
    })

    it('disconnects, tells its listeners, and can be connected again', async () => {
      const world = await make()
      await connect(world)
      let told = 0
      const stop = world.account.onChange(() => told++)
      await world.account.signOut()
      expect(await world.account.known()).toBe(false)
      expect(told).toBe(1)
      stop()
      expect(await connect(world)).toBe(true)
    })

    it('tells nobody when there was nothing to disconnect, and nobody who stopped listening', async () => {
      const world = await make()
      let told = 0
      const stop = world.account.onChange(() => told++)
      await world.account.signOut()
      expect(told).toBe(0)
      world.account.onChange(() => told++)()
      await connect(world)
      expect(told).toBe(1)
      stop()
    })
  })
}
