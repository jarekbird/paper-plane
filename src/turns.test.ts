import { Lifetime } from 'earshot'
import { describe, expect, it } from 'vitest'
import { turns } from './turns.ts'

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0))

describe('work that takes turns', () => {
  it('runs one piece after the other, in the order it was asked for, also when an earlier one is slower', async () => {
    const inTurn = turns(new Lifetime())
    const done: string[] = []
    let release = () => {}
    const slow = inTurn(async () => {
      await new Promise<void>(resolve => (release = resolve))
      done.push('first')
    })
    const fast = inTurn(async () => void done.push('second'))
    await tick()
    expect(done).toEqual([])
    release()
    await Promise.all([slow, fast])
    expect(done).toEqual(['first', 'second'])
  })

  it('goes on after a piece that failed, and gives each caller its own answer', async () => {
    const inTurn = turns(new Lifetime())
    const failed = inTurn(async () => {
      throw new Error('no')
    })
    const next = inTurn(async () => 'yes')
    await expect(failed).rejects.toThrow('no')
    expect(await next).toBe('yes')
  })

  it('A4: starts nothing that was waiting once its lifetime has ended', async () => {
    const life = new Lifetime()
    const inTurn = turns(life)
    let started = 0
    let release = () => {}
    const first = inTurn(async () => {
      started++
      await new Promise<void>(resolve => (release = resolve))
    }).catch(() => {})
    const second = inTurn(async () => void started++).catch(() => 'ended')
    await tick()
    life.end()
    release()
    await first
    expect(await second).toBe('ended')
    expect(started).toBe(1)
  })
})
