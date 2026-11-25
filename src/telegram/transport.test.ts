import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { socketOf } from './transport.ts'

const manifest = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8'))
const whitelist: string[] = manifest.permissions.find((permission: { name: string }) => permission.name === 'network').whitelist
const allowed = (url: string) =>
  whitelist.some(entry => new RegExp(`^${entry.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace('*', '[a-z0-9-]+')}(/|$)`).test(url))

describe('where the app connects for Telegram', () => {
  it('S2: has one fixed socket address for each of Telegram’s five data centres, all on the whitelist', () => {
    for (const dc of [1, 2, 3, 4, 5]) {
      expect(socketOf(dc)).toMatch(/^wss:\/\/[a-z]+\.web\.telegram\.org\/apiws$/)
      expect(allowed(socketOf(dc))).toBe(true)
    }
    expect(new Set([1, 2, 3, 4, 5].map(socketOf)).size).toBe(5)
  })

  it('connects nowhere for a data centre it does not know, instead of building an address', () => {
    expect(() => socketOf(6)).toThrow()
  })

  it('would not count an address elsewhere as allowed', () => {
    expect(allowed('wss://evil.example.org/apiws')).toBe(false)
    expect(allowed('wss://web.telegram.org.example.org/apiws')).toBe(false)
  })
})
