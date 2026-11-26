import { describe, expect, it } from 'vitest'
import { launch } from './launch.ts'

const APP = { id: '1234567', hash: '0123456789abcdef0123456789abcdef' }

describe('how the app is started', () => {
  it('has Telegram only when the build was given an app id', () => {
    expect(launch('', APP).own).toBe('telegram')
    expect(launch('', {}).own).toBe('none')
    expect(launch('', { id: '1234567' }).own).toBe('none')
  })

  it('offers the sample sign-in when asked for, in any build', () => {
    expect(launch('#account=sample', APP).own).toBe('sample')
    expect(launch('#account=sample', {}).own).toBe('sample')
  })

  it('S4: never writes what the glasses show to the console when the user’s own chats can be on them', () => {
    expect(launch('#trace', APP).trace).toBe(false)
    expect(launch('#trace', {}).trace).toBe(true)
    expect(launch('#trace&account=sample', APP).trace).toBe(true)
    expect(launch('', {}).trace).toBe(false)
  })

  it('takes scripted speech for the simulator', () => {
    expect(launch('#say=open sam|go back', {}).said).toEqual(['open sam', 'go back'])
    expect(launch('', {}).said).toBeNull()
  })

  it('stages trouble for the simulator on sample chats only, never on the user’s own', () => {
    expect(launch('#trouble=unreachable', {}).trouble).toBe('unreachable')
    expect(launch('#trouble=wait', {}).trouble).toBe('wait')
    expect(launch('#account=sample&trouble=ended', APP).trouble).toBe('ended')
    expect(launch('#trouble=unreachable', APP).trouble).toBeNull()
    expect(launch('#trouble=anything', {}).trouble).toBeNull()
    expect(launch('', {}).trouble).toBeNull()
  })
})
