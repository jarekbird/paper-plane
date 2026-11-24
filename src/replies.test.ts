import { describe, expect, it } from 'vitest'
import { quickReplies } from './replies.ts'

describe('quick replies', () => {
  it('answers a question with yes, no or a way to buy time', () => {
    expect(quickReplies('Are we still on for lunch?', [])).toEqual(['Yes', 'No', 'Let me check'])
    expect(quickReplies('can you send the file', [])).toEqual(['Yes', 'No', 'Let me check'])
  })

  it('answers thanks with a welcome', () => {
    expect(quickReplies('Thanks for yesterday.', [])[0]).toBe('You are welcome')
  })

  it('falls back to three answers that fit most messages, also when there is nothing to answer', () => {
    expect(quickReplies('Build is green.', [])).toEqual(['OK', 'Thanks', 'On my way'])
    expect(quickReplies(null, [])).toEqual(['OK', 'Thanks', 'On my way'])
  })

  it('adds the user’s own phrases after the fixed ones, once each', () => {
    expect(quickReplies('Build is green.', ['In a meeting, back at three', 'thanks', ' ', 'In a meeting, back at three'])).toEqual([
      'OK',
      'Thanks',
      'On my way',
      'In a meeting, back at three',
    ])
  })
})
