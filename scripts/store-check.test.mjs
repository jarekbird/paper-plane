import { describe, expect, it } from 'vitest'
import { NOT_DESTINATIONS } from './store-check.mjs'

describe('S2: what the store check lets the bundle name', () => {
  it('lets through nothing a web view could connect to: no web or socket address with a host', () => {
    for (const { url } of NOT_DESTINATIONS) {
      expect(url).not.toMatch(/^(https?|wss?):\/\/[a-z0-9]/i)
    }
  })

  it('says for each entry why it is no destination', () => {
    for (const { why } of NOT_DESTINATIONS) expect(why.length).toBeGreaterThan(20)
  })
})
