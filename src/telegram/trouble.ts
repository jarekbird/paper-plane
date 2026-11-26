import type { Lifetime, Timer } from 'earshot'
import { tl } from '@mtcute/core'
import { TroubleError, type Trouble } from '../messenger.ts'

const SIGNED_OUT = [
  'AUTH_KEY_UNREGISTERED',
  'AUTH_KEY_INVALID',
  'SESSION_REVOKED',
  'SESSION_EXPIRED',
  'USER_DEACTIVATED',
  'USER_DEACTIVATED_BAN',
] as const
const WAITS = ['FLOOD_WAIT_%d', 'SLOWMODE_WAIT_%d', 'FLOOD_PREMIUM_WAIT_%d'] as const

export const ANSWER_MS = 15_000

export type Within = <T>(work: (signal: AbortSignal) => Promise<T>) => Promise<T>

export const sentBefore = (error: unknown): boolean => tl.RpcError.is(error, 'RANDOM_ID_DUPLICATE')

export const signedOut = (error: unknown): boolean => SIGNED_OUT.some(code => tl.RpcError.is(error, code))

export function troubleOf(error: unknown): Trouble | null {
  if (error instanceof TroubleError) return error.trouble
  for (const code of WAITS) if (tl.RpcError.is(error, code)) return { kind: 'wait', seconds: error.seconds }
  return null
}

export function answerWithin(life: Lifetime, ms: number): Within {
  return async work => {
    const limit = new AbortController()
    let timer: Timer | undefined
    const leave = life.own(() => limit.abort())
    const late = new Promise<never>((_, reject) => {
      timer = life.timeout(() => {
        reject(new TroubleError({ kind: 'unreachable' }))
        limit.abort()
      }, ms)
    })
    try {
      return await life.guard(Promise.race([work(limit.signal), late]))
    } finally {
      timer?.cancel()
      leave()
    }
  }
}
