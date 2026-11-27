import { describe, expect, it } from 'vitest'
import { addressed, commandOf, findNamed, sameWords } from './names.ts'

const chats = [
  { id: 'anna', title: 'Anna Lee' },
  { id: 'annab', title: 'Anna Berg' },
  { id: 'launch', title: 'Launch crew' },
  { id: 'sam', title: 'Sam' },
  { id: 'news', title: 'Glasses news' },
]
const ids = (words: string) => findNamed(words, chats).matches.map(chat => chat.id)

describe('a chat said by name, found on the phone', () => {
  it('finds a chat by its whole title, in any case', () => {
    expect(ids('open launch crew')).toEqual(['launch'])
    expect(ids('Open Sam please')).toEqual(['sam'])
  })

  it('finds a person by first name when only one has it, and offers both when two do', () => {
    expect(ids('open launch')).toEqual(['launch'])
    expect(ids('open anna')).toEqual(['anna', 'annab'])
    expect(ids('open anna berg')).toEqual(['annab'])
  })

  it('forgives one wrong letter in a longer word, as speech-to-text makes them', () => {
    expect(ids('open lunch crew')).toEqual(['launch'])
    expect(ids('open glases news')).toEqual(['news'])
  })

  it('does not take a short name for another word', () => {
    expect(ids('open same')).toEqual([])
    expect(ids('what is new')).toEqual([])
  })

  it('finds nothing when no chat is named', () => {
    expect(findNamed('open the chat', chats)).toEqual({ matches: [], rest: '', at: null })
  })

  it('gives back what was said after the name, word for word, as the message', () => {
    expect(findNamed('tell Sam I’m ten minutes late', chats).rest).toBe('I’m ten minutes late')
    expect(findNamed('message launch crew: Build is green, shipping now', chats).rest).toBe('Build is green, shipping now')
    expect(findNamed('message Sam that was great', chats).rest).toBe('that was great')
    expect(findNamed('message Sam saying see you there', chats).rest).toBe('saying see you there')
    expect(findNamed('message Anna Berg to say goodbye is hard', chats).rest).toBe('to say goodbye is hard')
    expect(findNamed('open sam', chats).rest).toBe('')
  })

  it('drops only a colon or comma after the name, and keeps punctuation that belongs to the message', () => {
    expect(findNamed('message Sam -5 degrees here', chats).rest).toBe('-5 degrees here')
    expect(findNamed('message Sam .5 litres is enough', chats).rest).toBe('.5 litres is enough')
    expect(findNamed('message Sam, see you there', chats).rest).toBe('see you there')
    expect(findNamed('message Sam - not today', chats).rest).toBe('- not today')
  })

  it('takes the first chat named as the one meant: a name later in the sentence is part of the message', () => {
    expect(findNamed('message Anna Lee ask Launch crew about the demo', chats)).toEqual({
      matches: [chats[0]],
      rest: 'ask Launch crew about the demo',
      at: 1,
    })
    expect(findNamed('tell Sam Anna Berg is running late', chats)).toEqual({
      matches: [chats[3]],
      rest: 'Anna Berg is running late',
      at: 1,
    })
    expect(ids('tell anna that launch crew is waiting')).toEqual(['anna', 'annab'])
  })

  it('gives back no message when the chat is not certain', () => {
    expect(findNamed('tell anna I am late', chats).rest).toBe('')
  })
})

describe('a command read on the phone by its first word', () => {
  it('knows a message by its first word, whatever the message says and whether or not a picked chat is named', () => {
    for (const words of [
      'message Sam I will go back tomorrow',
      'tell launch crew to go home and open the chat',
      'text Anna mark all read is broken',
      'message to Sam see you there',
      'message Robert I will go back tomorrow',
      'message someone',
      'tell me a joke',
    ]) {
      expect(commandOf(words)).toBe('message')
    }
  })

  it('knows opening a chat the same way', () => {
    for (const words of ['open Sam', 'show launch crew', 'open Robert and go back', 'open the door for Sam'])
      expect(commandOf(words)).toBe('open')
  })

  it('leaves a sentence that starts with any other word to the navigator', () => {
    for (const words of ['I will message Sam later', 'please message Sam', 'go back', 'Sam', 'constructor Sam', '']) {
      expect(commandOf(words)).toBeNull()
    }
  })

  it('takes a chat as the one meant only when its name comes right after the command word', () => {
    expect(addressed('message Robert ask Sam about lunch', chats).matches).toEqual([])
    expect(addressed('I need to message Robert about Sam', chats).matches).toEqual([])
    expect(addressed('open the door for Sam', chats).matches).toEqual([])
    expect(addressed('Sam', chats).matches).toEqual([])
    expect(addressed('please message Sam see you there', chats)).toMatchObject({ matches: [chats[3]], rest: 'see you there' })
    expect(addressed('tell launch crew go home', chats)).toMatchObject({ matches: [chats[2]], rest: 'go home' })
  })

  it('finds the chat in "open the chat with Anna", as people say it, and still not in a sentence about something else (measured on speech: it asked "Which chat?")', () => {
    expect(addressed('Open the chat with Sam.', chats).matches).toEqual([chats[3]])
    expect(addressed('open my conversation with launch crew', chats).matches).toEqual([chats[2]])
    expect(addressed('show me Sam', chats).matches).toEqual([chats[3]])
    expect(addressed('open up the chat with Sam', chats).matches).toEqual([chats[3]])
    expect(addressed('open the door for Sam', chats).matches).toEqual([])
    expect(addressed('show the plan to Sam', chats).matches).toEqual([])
    expect(addressed('message the chat with Sam hello', chats).matches).toEqual([])
  })

  it('does not take an ordinary word for a command word', () => {
    expect(addressed('constructor Sam', chats).matches).toEqual([])
  })

  it('knows when what was said is exactly an action’s own name', () => {
    expect(sameWords('Message someone', 'message someone.')).toBe(true)
    expect(sameWords('Open chat', 'open the chat')).toBe(false)
  })
})
