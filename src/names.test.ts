import { describe, expect, it } from 'vitest'
import { addressed, commandOf, findNamed } from './names.ts'

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

describe('a command that names its chat, read on the phone', () => {
  it('knows a message to a named chat by its first words, whatever the message says', () => {
    expect(commandOf('message Sam I will go back tomorrow', chats)).toBe('message')
    expect(commandOf('tell launch crew to go home and open the chat', chats)).toBe('message')
    expect(commandOf('text Anna mark all read is broken', chats)).toBe('message')
    expect(commandOf('message to Sam see you there', chats)).toBe('message')
  })

  it('knows opening a named chat', () => {
    expect(commandOf('open Sam', chats)).toBe('open')
    expect(commandOf('show launch crew', chats)).toBe('open')
  })

  it('leaves everything else to the navigator: no chat named, or not right after the verb', () => {
    for (const words of ['message someone', 'tell me a joke', 'open the door for Sam', 'I will message Sam later', 'go back', 'Sam']) {
      expect(commandOf(words, chats)).toBeNull()
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

  it('does not take an ordinary word for a command word', () => {
    expect(commandOf('constructor Sam', chats)).toBeNull()
    expect(addressed('constructor Sam', chats).matches).toEqual([])
  })
})
