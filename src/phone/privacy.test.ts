import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { whatLeaves } from './privacy.ts'

const ALL = { telegram: true, voice: true, calendar: true }
const NONE = { telegram: false, voice: false, calendar: false }
const text = (build: { telegram: boolean; voice: boolean; calendar: boolean }) =>
  whatLeaves(build)
    .map(line => `${line.heading}: ${line.text}`)
    .join('\n')

describe('what the phone page says leaves the phone', () => {
  it('S1: with Telegram and voice, names Telegram, the relay with the sound and the words, and that nothing of Telegram goes with them', () => {
    const all = text(ALL)
    expect(all).toMatch(/To Telegram: .*straight from this phone to Telegram\. No server of ours/)
    expect(all).toMatch(/When you hold to talk: The sound of that hold goes to Paper Plane's relay/)
    expect(all).toMatch(/no message, no chat name and no person's name from Telegram/)
    expect(all).toMatch(/OpenRouter/)
  })

  it('S1, S7: with Google Calendar, says what goes to Google, that the sign-in passes through the relay, and how long the relay keeps it', () => {
    const all = text(ALL)
    expect(all).toMatch(/To Google: Only if you connect Google Calendar\./)
    expect(all).toMatch(/a meeting you confirm with a tap is added there with its time and the name of its chat, straight from this phone/)
    expect(all).toMatch(/The Google sign-in itself passes through Paper Plane's relay when you connect and when it is renewed/)
    expect(all).toMatch(
      /Kept by us: Nothing but a Google sign-in on its way to this phone: the relay keeps it for five minutes at most and hands it over once\. It keeps no log/,
    )
    expect(all).toMatch(/Kept on this phone: .*your Google sign-in/)
  })

  it('says nothing leaves for a service the build does not have, instead of describing one', () => {
    const none = text(NONE)
    expect(none).toMatch(/To Telegram: Nothing\..*samples/)
    expect(none).toMatch(/When you hold to talk: Nothing\./)
    expect(none).toMatch(/To Google: Nothing\./)
    expect(none).toMatch(/Kept by us: Nothing\. The relay stores nothing and keeps no log/)
    expect(none).not.toMatch(/relay\. AI|OpenRouter|straight from this phone|Google sign-in/)
  })

  it('S5: always says what is kept, by whom, and that only a tap sends', () => {
    for (const build of [ALL, NONE]) {
      const said = text(build)
      expect(said).toMatch(/Kept on this phone: /)
      expect(said).toMatch(/Kept by us: Nothing/)
      expect(said).toMatch(/Sent in your name: Only what you tapped\./)
    }
  })

  it('says the same in PRIVACY.md, word for word, so the page and the document cannot drift apart', () => {
    const document = readFileSync(new URL('../../PRIVACY.md', import.meta.url), 'utf8').replace(/\s+/g, ' ')
    for (const line of whatLeaves(ALL)) expect(document).toContain(line.text)
  })
})
