import { fitText, SCREEN_WIDTH } from 'earshot'
import { describe, expect, it } from 'vitest'
import { TroubleError } from './messenger.ts'
import { span, troubleWords, UNREACHABLE } from './trouble.ts'

describe('how long Telegram asks to wait, in words', () => {
  it.each([
    [0, '1 second'],
    [1, '1 second'],
    [45, '45 seconds'],
    [60, '1 minute'],
    [61, '2 minutes'],
    [3_599, '60 minutes'],
    [3_600, '1 hour'],
    [3_601, '2 hours'],
    [86_400, '1 day'],
    [200_000, '3 days'],
  ])('rounds %d seconds up to "%s", so the wait is never over before it says so', (seconds, words) => {
    expect(span(seconds)).toBe(words)
  })
})

describe('what the user is told when Telegram is in trouble', () => {
  it('says Telegram cannot be reached, and how long to wait when Telegram says so', () => {
    expect(troubleWords(new TroubleError({ kind: 'unreachable' }), 'Not sent')).toBe(UNREACHABLE)
    expect(troubleWords(new TroubleError({ kind: 'wait', seconds: 90 }), 'Not sent')).toBe('Telegram says wait 2 minutes')
  })

  it('keeps the words of the action for any other failure', () => {
    expect(troubleWords(new Error('anything'), 'Not sent')).toBe('Not sent')
  })

  it('C5: fits one line of the glasses, whatever the wait', () => {
    for (const seconds of [59, 3_599, 86_399, 8_640_000]) {
      const words = troubleWords(new TroubleError({ kind: 'wait', seconds }), '')
      expect(fitText(words, SCREEN_WIDTH - 40)).toBe(words)
    }
    expect(fitText(UNREACHABLE, SCREEN_WIDTH - 40)).toBe(UNREACHABLE)
  })
})
