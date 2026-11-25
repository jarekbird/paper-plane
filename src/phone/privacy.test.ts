import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { whatLeaves } from './privacy.ts'

const text = (build: { telegram: boolean; voice: boolean }) =>
  whatLeaves(build)
    .map(line => `${line.heading}: ${line.text}`)
    .join('\n')

describe('what the phone page says leaves the phone', () => {
  it('S1: with Telegram and voice, names Telegram, the relay with the sound and the words, and that nothing of Telegram goes with them', () => {
    const all = text({ telegram: true, voice: true })
    expect(all).toMatch(/To Telegram: .*straight from this phone to Telegram\. No server of ours/)
    expect(all).toMatch(/When you hold to talk: The sound of that hold goes to Paper Plane's relay/)
    expect(all).toMatch(/no message, no chat name and no person's name from Telegram/)
    expect(all).toMatch(/OpenRouter/)
  })

  it('says nothing leaves for a service the build does not have, instead of describing one', () => {
    const none = text({ telegram: false, voice: false })
    expect(none).toMatch(/To Telegram: Nothing\..*samples/)
    expect(none).toMatch(/When you hold to talk: Nothing\./)
    expect(none).not.toMatch(/relay\. AI|OpenRouter|straight from this phone/)
  })

  it('S5, S7: always says what is kept, by whom, and that only a tap sends', () => {
    for (const build of [
      { telegram: true, voice: true },
      { telegram: false, voice: false },
    ]) {
      const said = text(build)
      expect(said).toMatch(/Kept on this phone: /)
      expect(said).toMatch(/Kept by us: Nothing\. The relay stores nothing and keeps no log/)
      expect(said).toMatch(/Sent in your name: Only what you tapped\./)
    }
  })

  it('says the same in PRIVACY.md, word for word, so the page and the document cannot drift apart', () => {
    const document = readFileSync(new URL('../../PRIVACY.md', import.meta.url), 'utf8').replace(/\s+/g, ' ')
    for (const line of whatLeaves({ telegram: true, voice: true })) expect(document).toContain(line.text)
  })
})
