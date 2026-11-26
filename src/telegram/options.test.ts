import { describe, expect, it, vi } from 'vitest'
import { clientOptions } from './options.ts'

describe('how a Telegram connection is made', () => {
  it('S4: has the library’s own logging off, since its warnings can print what Telegram answered', () => {
    expect(clientOptions({ apiId: 1, apiHash: 'x' }).logLevel).toBe(0)
  })

  it('S1: keeps the session in memory only; what is kept on the phone goes through the store', () => {
    expect(clientOptions({ apiId: 1, apiHash: 'x' }).storage.constructor.name).toBe('MemoryStorage')
  })

  it('S5: hears at once that Telegram already has a message, where the library would ask again and again like for any error of Telegram’s own', async () => {
    vi.useFakeTimers()
    try {
      const middlewares = clientOptions({ apiId: 1, apiHash: 'x' }).network.middlewares
      const errors = middlewares.at(-1)!
      const context = {
        request: { _: 'messages.sendMessage' },
        params: {},
        manager: { _log: { warn: () => {} }, teardownSignal: new AbortController().signal },
      } as never
      const answering = (errorMessage: string) => {
        let asked = 0
        const next = async () => {
          asked++
          return asked > 3 ? { _: 'ok' } : { _: 'mt_rpc_error', errorCode: 500, errorMessage }
        }
        return { asked: () => asked, done: errors(context, next as never) }
      }
      const duplicate = answering('RANDOM_ID_DUPLICATE')
      await vi.advanceTimersByTimeAsync(10_000)
      expect(duplicate.asked()).toBe(1)
      expect(await duplicate.done).toMatchObject({ errorMessage: 'RANDOM_ID_DUPLICATE' })
      const other = answering('INTERNAL')
      await vi.advanceTimersByTimeAsync(10_000)
      expect(other.asked()).toBe(4)
    } finally {
      vi.useRealTimers()
    }
  })
})
