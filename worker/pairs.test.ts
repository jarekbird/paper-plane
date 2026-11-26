import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KEEP_SECONDS } from './google.ts'
import { pairsIn, PairStore, type PairNamespace, type PairStorage } from './pairs.ts'

function storage() {
  const kept = new Map<string, string>()
  const alarms: number[] = []
  const store: PairStorage = {
    get: async key => kept.get(key),
    put: async (key, value) => void kept.set(key, value),
    deleteAll: async () => void kept.clear(),
    setAlarm: async at => void alarms.push(at),
  }
  return { store, kept, alarms }
}

function namespace() {
  const objects = new Map<string, { object: PairStore; held: ReturnType<typeof storage> }>()
  const space: PairNamespace = {
    idFromName: name => name,
    get: id => {
      const name = String(id)
      if (!objects.has(name)) {
        const held = storage()
        objects.set(name, { object: new PairStore({ storage: held.store }), held })
      }
      const { object } = objects.get(name)!
      return { fetch: (input, init) => object.fetch(new Request(input, init)) }
    },
  }
  return { space, objects }
}

const NOW = 1_800_000_000_000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => void vi.useRealTimers())

describe('where the Worker keeps a Google sign-in on its way to the phone', () => {
  it('S7: hands it over once, and then has it no more', async () => {
    const { space, objects } = namespace()
    const pairs = pairsIn(space)
    await pairs.put('pair-1', 'the sign-in', { expirationTtl: KEEP_SECONDS })
    expect(await pairs.take('pair-1')).toBe('the sign-in')
    expect(await pairs.take('pair-1')).toBeNull()
    expect(objects.get('pair-1')!.held.kept.size).toBe(0)
  })

  it('S7: gives it to one of two that ask at the same moment', async () => {
    const pairs = pairsIn(namespace().space)
    await pairs.put('pair-1', 'the sign-in', { expirationTtl: KEEP_SECONDS })
    const taken = await Promise.all([pairs.take('pair-1'), pairs.take('pair-1')])
    expect(taken.filter(Boolean)).toEqual(['the sign-in'])
  })

  it('S7: has it for five minutes and not a moment longer, also if the clean-up has not run yet', async () => {
    const { space, objects } = namespace()
    const pairs = pairsIn(space)
    await pairs.put('pair-1', 'the sign-in', { expirationTtl: KEEP_SECONDS })
    expect(objects.get('pair-1')!.held.alarms).toEqual([NOW + 300_000])
    vi.setSystemTime(NOW + 300_000)
    expect(await pairs.take('pair-1')).toBeNull()
    expect(objects.get('pair-1')!.held.kept.size).toBe(0)
  })

  it('S7: is emptied by its clean-up when nobody came', async () => {
    const { space, objects } = namespace()
    await pairsIn(space).put('pair-1', 'the sign-in', { expirationTtl: KEEP_SECONDS })
    await objects.get('pair-1')!.object.alarm()
    expect(objects.get('pair-1')!.held.kept.size).toBe(0)
  })

  it('keeps each pair apart: one cannot take what was kept for another', async () => {
    const pairs = pairsIn(namespace().space)
    await pairs.put('pair-1', 'the sign-in', { expirationTtl: KEEP_SECONDS })
    expect(await pairs.take('pair-2')).toBeNull()
    expect(await pairs.take('pair-1')).toBe('the sign-in')
  })

  it('has nothing to give before anything was kept, and answers no other call', async () => {
    const { store } = storage()
    const object = new PairStore({ storage: store })
    expect((await object.fetch(new Request('https://pairs.invalid/', { method: 'POST' }))).status).toBe(404)
    expect((await object.fetch(new Request('https://pairs.invalid/'))).status).toBe(404)
  })

  it('S4, S7: logs nothing, and keeps one entry', () => {
    const code = readFileSync(new URL('./pairs.ts', import.meta.url), 'utf8')
    expect(code).not.toMatch(/console|caches|waitUntil/)
    expect(code.match(/storage\.put\(/g)).toHaveLength(1)
  })
})
