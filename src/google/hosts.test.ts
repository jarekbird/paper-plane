import { readFileSync } from 'node:fs'
import { Lifetime } from 'earshot'
import { describe, expect, it } from 'vitest'
import { googleAccount } from './account.ts'
import { calendarOver } from './calendar.ts'
import { googleSide } from './testing.ts'

const manifest = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8'))
const whitelist: string[] = manifest.permissions.find((permission: { name: string }) => permission.name === 'network').whitelist

describe('where the Google service connects', () => {
  it('S2: every address it asks is on the whitelist: Google’s two hosts, and the relay', async () => {
    const side = googleSide()
    const asked: string[] = []
    const ask: typeof fetch = (input, init) => {
      asked.push(new URL(String(input)).origin)
      return side.ask(String(input).replace('https://paper-plane-relay.jarekbird.workers.dev', 'https://relay.example'), init)
    }
    let kept: string | null = null
    let clock = 1_800_000_000_000
    const life = new Lifetime()
    const account = googleAccount(life, {
      relay: 'https://paper-plane-relay.jarekbird.workers.dev',
      place: { load: async () => kept, save: async next => void (kept = next) },
      ask,
      now: () => clock,
    })
    const live = new AbortController().signal
    await account.finish(side.consent(await account.begin()), live)
    const calendar = calendarOver(life, account, ask)
    const added = await calendar.add({ title: 'Anna', start: clock + 600_000, end: clock + 4_200_000 }, live)
    await calendar.next(clock, live)
    await calendar.remove(added, live)
    clock += 61 * 60_000
    await account.token(account.signIn(), live)
    await account.signOut()
    expect([...new Set(asked)].sort()).toEqual([
      'https://oauth2.googleapis.com',
      'https://paper-plane-relay.jarekbird.workers.dev',
      'https://www.googleapis.com',
    ])
    for (const origin of asked) expect(whitelist).toContain(origin)
  })
})
