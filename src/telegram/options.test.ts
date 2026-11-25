import { describe, expect, it } from 'vitest'
import { clientOptions } from './options.ts'

describe('how a Telegram connection is made', () => {
  it('S4: has the library’s own logging off, since its warnings can print what Telegram answered', () => {
    expect(clientOptions({ apiId: 1, apiHash: 'x' }).logLevel).toBe(0)
  })

  it('S1: keeps the session in memory only; what is kept on the phone goes through the store', () => {
    expect(clientOptions({ apiId: 1, apiHash: 'x' }).storage.constructor.name).toBe('MemoryStorage')
  })
})
