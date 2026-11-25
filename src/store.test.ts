import { createStore, memoryPlace, type Place } from 'earshot'
import { describe, expect, it } from 'vitest'
import { storeOver } from './store.ts'

function failing(place: Place) {
  const state = { writes: true, reads: true }
  const guarded: Place = {
    read: key => (state.reads ? place.read(key) : Promise.reject(new Error('unreadable'))),
    write: (key, value) => (state.writes ? place.write(key, value) : Promise.reject(new Error('unwritable'))),
  }
  return { place: guarded, state }
}

describe('where the sign-in is kept on the phone', () => {
  it('is kept in both places, and read back', async () => {
    const { sessions } = storeOver([memoryPlace(), memoryPlace()])
    await sessions.save('session-1')
    expect(await sessions.load()).toBe('session-1')
  })

  it('S5: counts as removed only when every copy is gone, so no copy can bring a sign-in back', async () => {
    const even = failing(memoryPlace())
    const web = failing(memoryPlace())
    const { sessions } = storeOver([even.place, web.place])
    await sessions.save('session-1')
    even.state.writes = false
    await expect(sessions.save(null)).rejects.toThrow()
    even.state.writes = true
    web.state.reads = false
    expect(await createStore([even.place]).get('telegram-session')).toBe('session-1')
    web.state.reads = true
    await sessions.save(null)
    expect(await createStore([even.place]).get('telegram-session')).toBeNull()
    expect(await createStore([web.place]).get('telegram-session')).toBeNull()
  })
})
