import { describe, expect, it } from 'vitest'
import { instructed, MESSAGE_LIMIT, oneMessage } from './instruction.ts'

describe('words that ask for a message to be written, not sent as said', () => {
  it('are a sentence that starts by telling or asking the person in the chat', () => {
    for (const words of [
      'tell her yes and ask where',
      'Tell him I am running ten minutes late',
      'ask them if Thursday still works',
      'tell everyone the demo moved to four',
      'let her know I got the keys',
      'say yes and ask what time',
      'reply that I will call tonight',
      'answer no, not this week',
      'respond with thanks and see you there',
    ]) {
      expect(instructed(words), words).toBe(true)
    }
  })

  it('are not a message that only happens to start with such a word: it goes out as said', () => {
    for (const words of [
      'see you at noon',
      'tell me when you land',
      'ask your sister about Friday',
      'tell Sam the demo moved',
      'let me know when you are close',
      'let them in please',
      'say hi to your mom',
      'reply when you can',
      'answer the door',
      'tell her',
      'I will tell her tonight',
      '',
    ]) {
      expect(instructed(words), words).toBe(false)
    }
  })
})

describe('what a writer gives back, made one message', () => {
  it('is one line without the quotes a model likes to add', () => {
    expect(oneMessage(' "Yes!\n\nWhere should we meet?" ')).toBe('Yes! Where should we meet?')
    expect(oneMessage('“On my way.”')).toBe('On my way.')
    expect(oneMessage('I said "no" twice')).toBe('I said "no" twice')
  })

  it('is nothing when it is longer than a message someone would dictate, so the words as said stay', () => {
    expect(oneMessage('a'.repeat(MESSAGE_LIMIT))).toHaveLength(MESSAGE_LIMIT)
    expect(oneMessage('a'.repeat(MESSAGE_LIMIT + 1))).toBe('')
    expect(oneMessage('  \n ')).toBe('')
  })
})
