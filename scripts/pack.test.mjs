import { describe, expect, it } from 'vitest'
import { envOf, parts } from './pack.mjs'

describe('what a pack says it holds', () => {
  it('S3: reads the build settings from .env.local by name, and says which parts they turn on, never their values', () => {
    const env = envOf('VITE_TELEGRAM_API_ID=123\nVITE_TELEGRAM_API_HASH = abc \n# note\nOTHER=1\nVITE_RELAY=https://relay.example\n')
    expect(env).toEqual({ VITE_TELEGRAM_API_ID: '123', VITE_TELEGRAM_API_HASH: 'abc', VITE_RELAY: 'https://relay.example' })
    expect(parts(env)).toEqual({ telegram: true, voice: true })
  })

  it('says a pack has no Telegram when either half of the app id is missing, and no voice without a relay', () => {
    expect(parts({ VITE_TELEGRAM_API_ID: '123' })).toEqual({ telegram: false, voice: false })
    expect(parts({})).toEqual({ telegram: false, voice: false })
  })
})
