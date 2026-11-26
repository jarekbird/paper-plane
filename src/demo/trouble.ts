import type { Lifetime } from 'earshot'
import type { Trouble } from '../messenger.ts'
import type { DemoAccount } from './account.ts'
import type { DemoMessenger } from './messenger.ts'

export const STAGE_STARTS_MS = 8_000
export const STAGE_ENDS_MS = 30_000
const STAGED: Record<'unreachable' | 'wait', Trouble> = { unreachable: { kind: 'unreachable' }, wait: { kind: 'wait', seconds: 120 } }

export function stage(
  life: Lifetime,
  kind: 'unreachable' | 'wait' | 'ended',
  parts: { messengers: readonly DemoMessenger[]; account?: DemoAccount },
): void {
  const { messengers, account } = parts
  if (kind === 'ended') {
    life.timeout(() => account?.endElsewhere(), STAGE_STARTS_MS)
    return
  }
  life.timeout(() => {
    for (const messenger of messengers) messenger.trouble(STAGED[kind])
  }, STAGE_STARTS_MS)
  life.timeout(() => {
    for (const messenger of messengers) messenger.trouble(null)
  }, STAGE_ENDS_MS)
}
