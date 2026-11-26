import { Lifetime } from 'earshot'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TroubleError } from '../messenger.ts'
import { demoAccount } from './account.ts'
import { demoMessenger } from './messenger.ts'
import { stage, STAGE_ENDS_MS, STAGE_STARTS_MS } from './trouble.ts'

beforeEach(() => void vi.useFakeTimers())
afterEach(() => void vi.useRealTimers())

describe('trouble staged on the sample account, for the simulator', () => {
  it('starts after the first screens are up, and passes by itself', async () => {
    const life = new Lifetime()
    const messenger = demoMessenger()
    stage(life, 'unreachable', { messengers: [messenger] })
    await vi.advanceTimersByTimeAsync(STAGE_STARTS_MS - 1)
    expect((await messenger.chats()).length).toBeGreaterThan(0)
    await vi.advanceTimersByTimeAsync(1)
    await expect(messenger.chats()).rejects.toBeInstanceOf(TroubleError)
    await vi.advanceTimersByTimeAsync(STAGE_ENDS_MS - STAGE_STARTS_MS)
    expect((await messenger.chats()).length).toBeGreaterThan(0)
    life.end()
  })

  it('ends the sample sign-in as if from another device', async () => {
    const life = new Lifetime()
    const session = { signedIn: true }
    const account = demoAccount(session)
    let told = 0
    account.onEnded(() => told++)
    stage(life, 'ended', { messengers: [], account })
    await vi.advanceTimersByTimeAsync(STAGE_STARTS_MS)
    expect(told).toBe(1)
    expect(session.signedIn).toBe(false)
    life.end()
  })

  it('A4: stages nothing once the app has ended', async () => {
    const life = new Lifetime()
    const messenger = demoMessenger()
    stage(life, 'wait', { messengers: [messenger] })
    life.end()
    await vi.advanceTimersByTimeAsync(STAGE_ENDS_MS)
    expect((await messenger.chats()).length).toBeGreaterThan(0)
  })
})
