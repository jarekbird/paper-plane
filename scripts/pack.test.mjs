import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parts } from './pack.mjs'

const made = []
function folder(files) {
  const dir = mkdtempSync(join(tmpdir(), 'paper-plane-pack-'))
  made.push(dir)
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text)
  return dir
}

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('what a pack says it holds, read the way the build reads it', () => {
  it('says Telegram and voice are in when .env.local sets all three', () => {
    const dir = folder({ '.env.local': 'VITE_TELEGRAM_API_ID=123\nVITE_TELEGRAM_API_HASH=abc\nVITE_RELAY=https://relay.example\n' })
    expect(parts(dir)).toEqual({ telegram: true, voice: true })
  })

  it('says a part is not in when its setting is there but empty, quoted or not', () => {
    const dir = folder({ '.env.local': 'VITE_TELEGRAM_API_ID=""\nVITE_TELEGRAM_API_HASH=\nVITE_RELAY=""\n' })
    expect(parts(dir)).toEqual({ telegram: false, voice: false })
  })

  it('needs both halves of the app id', () => {
    expect(parts(folder({ '.env.local': 'VITE_TELEGRAM_API_ID=123\n' }))).toEqual({ telegram: false, voice: false })
    expect(parts(folder({}))).toEqual({ telegram: false, voice: false })
  })

  it('follows the production files and their order, as the build does', () => {
    const dir = folder({
      '.env': 'VITE_RELAY=https://relay.example\nBASE=123\nVITE_TELEGRAM_API_ID=$BASE\nVITE_TELEGRAM_API_HASH=abc\n',
      '.env.production.local': 'VITE_RELAY=\n',
    })
    expect(parts(dir)).toEqual({ telegram: true, voice: false })
  })
})
