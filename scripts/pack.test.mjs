import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parts } from './pack.mjs'

const made = []
function folder(files) {
  const dir = mkdtempSync(join(tmpdir(), 'paper-plane-pack-'))
  made.push(dir)
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text)
  return dir
}

const SETTINGS = ['VITE_TELEGRAM_API_ID', 'VITE_TELEGRAM_API_HASH', 'VITE_RELAY']
const given = new Map()

beforeEach(() => {
  for (const name of SETTINGS) {
    given.set(name, process.env[name])
    delete process.env[name]
  }
})

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
  for (const [name, value] of given) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
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

  it('counts a setting given in the environment, as the build does, and nothing the test run itself was started with', () => {
    expect(parts(folder({}))).toEqual({ telegram: false, voice: false })
    process.env.VITE_RELAY = 'https://relay.example'
    expect(parts(folder({}))).toEqual({ telegram: false, voice: true })
  })

  it('follows the production files and their order, as the build does', () => {
    const dir = folder({
      '.env': 'VITE_RELAY=https://relay.example\nBASE=123\nVITE_TELEGRAM_API_ID=$BASE\nVITE_TELEGRAM_API_HASH=abc\n',
      '.env.production.local': 'VITE_RELAY=\n',
    })
    expect(parts(dir)).toEqual({ telegram: true, voice: false })
  })
})
