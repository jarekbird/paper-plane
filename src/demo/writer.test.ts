import { describe, expect, it } from 'vitest'
import { writerContract } from '../writer.contract.ts'
import { demoWriter } from './writer.ts'

writerContract('the sample writer', demoWriter)

describe('the sample writer, a stand-in with fixed rules and no model', () => {
  it('makes sentences of an instruction, so the sample account shows the flow', async () => {
    const write = (words: string) => demoWriter().write(words, new AbortController().signal)
    expect(await write('tell her yes and ask where')).toBe('Yes. Where?')
    expect(await write('ask them if Thursday still works')).toBe('Thursday still works?')
    expect(await write('let him know I got the keys')).toBe('I got the keys.')
    expect(await write('reply that I will call tonight and tell her thanks')).toBe('I will call tonight. Thanks.')
  })
})
