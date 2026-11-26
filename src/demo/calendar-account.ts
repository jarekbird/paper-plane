import type { CalendarAccount } from '../messenger.ts'

export const DEMO_PAIR_CODE = '123456'

export function demoCalendarAccount(session: { connected: boolean }): CalendarAccount {
  const listeners = new Set<() => void>()
  let begun = false
  const tell = () => {
    for (const told of [...listeners]) told()
  }
  return {
    known: async () => session.connected,
    begin: async () => {
      begun = true
      return 'demo://local'
    },
    finish: async (code, signal) => {
      signal.throwIfAborted()
      if (!begun) return false
      begun = false
      if (code.replace(/\D/g, '') !== DEMO_PAIR_CODE) return false
      await Promise.resolve()
      signal.throwIfAborted()
      session.connected = true
      tell()
      return true
    },
    signOut: async () => {
      if (!session.connected) return 'ended'
      session.connected = false
      tell()
      return 'ended'
    },
    onChange: told => {
      listeners.add(told)
      return () => void listeners.delete(told)
    },
  }
}
