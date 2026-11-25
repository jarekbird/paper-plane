import { describe, expect, it } from 'vitest'
import { instructed, MESSAGE_LIMIT, noteOf, oneMessage } from './instruction.ts'

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

describe('the note a writer is given: who the message is for, worked out on the phone', () => {
  it('names the person in the chat "them" and drops the telling, so a model cannot take them for someone else', () => {
    expect(noteOf('tell her yes and ask where')).toBe('Tell them: yes and ask where')
    expect(noteOf('Tell everyone the demo moved to four')).toBe('Tell them: the demo moved to four')
    expect(noteOf('let him know I got the keys')).toBe('Tell them: I got the keys')
    expect(noteOf('ask them if Thursday still works')).toBe('Ask them: if Thursday still works')
    expect(noteOf('say yes and ask what time')).toBe('Tell them: yes and ask what time')
    expect(noteOf('answer no, not this week')).toBe('Tell them: no, not this week')
  })

  it('changes nothing after that: who a later "ask him" or "tell her" means is not for the phone to guess', () => {
    expect(noteOf('tell her I will call Sam and ask him if he can help')).toBe('Tell them: I will call Sam and ask him if he can help')
    expect(noteOf('tell her I will tell Sam and ask Robin tomorrow')).toBe('Tell them: I will tell Sam and ask Robin tomorrow')
    expect(noteOf('say yes and ask him what time')).toBe('Tell them: yes and ask him what time')
  })

  it('keeps a "with" after the opening for the same reason', () => {
    expect(noteOf('reply with or without you, I am going')).toBe('Tell them: with or without you, I am going')
    expect(noteOf('respond with thanks and see you there')).toBe('Tell them: with thanks and see you there')
  })

  it('keeps a "that" after the opening: it may be the first word of the message', () => {
    expect(noteOf('tell her that and the blue one are mine')).toBe('Tell them: that and the blue one are mine')
    expect(noteOf('reply that works for me')).toBe('Tell them: that works for me')
    expect(noteOf('let him know that I got the keys')).toBe('Tell them: that I got the keys')
    expect(noteOf('say that I will call tonight')).toBe('Tell them: that I will call tonight')
  })

  it('takes any other words whole, as what to tell them', () => {
    expect(noteOf('  see you   at noon ')).toBe('Tell them: see you at noon')
    expect(noteOf('tell her, yes')).toBe('Tell them: tell her, yes')
  })
})

describe('what a writer gives back, made one message', () => {
  it('starts with a capital letter and ends as a sentence, which a model sometimes leaves out', () => {
    expect(oneMessage('yes, where?')).toBe('Yes, where?')
    expect(oneMessage('I got the keys')).toBe('I got the keys.')
    expect(oneMessage('No')).toBe('No.')
    expect(oneMessage('On my way!')).toBe('On my way!')
    expect(oneMessage('See you at 7')).toBe('See you at 7.')
    expect(oneMessage('Great 🙂')).toBe('Great 🙂')
  })

  it('is one line without the quotes a model likes to add', () => {
    expect(oneMessage(' "Yes!\n\nWhere should we meet?" ')).toBe('Yes! Where should we meet?')
    expect(oneMessage('“On my way.”')).toBe('On my way.')
    expect(oneMessage('I said "no" twice')).toBe('I said "no" twice.')
  })

  it('is nothing when it is longer than a message someone would dictate, so the words as said stay', () => {
    expect(oneMessage(`${'A'.repeat(MESSAGE_LIMIT - 1)}.`)).toHaveLength(MESSAGE_LIMIT)
    expect(oneMessage(`${'A'.repeat(MESSAGE_LIMIT)}.`)).toBe('')
    expect(oneMessage('  \n ')).toBe('')
  })
})
