import { describe, expect, it } from 'vitest'
import { MESSAGE_LIMIT } from './instruction.ts'
import type { Writer } from './messenger.ts'

export function writerContract(name: string, make: () => Writer): void {
  describe(`A6: ${name} keeps the writer contract`, () => {
    it('gives back one message for what was said: one line, no longer than a message', async () => {
      const written = await make().write('tell her yes and ask where', new AbortController().signal)
      expect(written).not.toBe('')
      expect(written).not.toMatch(/\n/)
      expect(written.length).toBeLessThanOrEqual(MESSAGE_LIMIT)
      expect(written).toBe(written.trim())
    })

    it('writes nothing for a hold that was called off', async () => {
      const left = new AbortController()
      left.abort()
      await expect(make().write('tell her yes and ask where', left.signal)).rejects.toThrow()
    })
  })
}
