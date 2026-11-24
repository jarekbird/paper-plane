import { describe, expect, it } from 'vitest'
import { findNamed } from './names.ts'

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
    expect(findNamed('open the chat', chats)).toEqual({ matches: [], rest: '' })
  })

  it('gives back what was said after the name, as the message, in the user’s own words', () => {
    expect(findNamed('tell Sam I’m ten minutes late', chats).rest).toBe('I’m ten minutes late')
    expect(findNamed('message launch crew: Build is green, shipping now', chats).rest).toBe('Build is green, shipping now')
    expect(findNamed('tell Sam that the demo moved', chats).rest).toBe('the demo moved')
    expect(findNamed('message Sam saying see you there', chats).rest).toBe('see you there')
    expect(findNamed('open sam', chats).rest).toBe('')
  })

  it('gives back no message when the chat is not certain', () => {
    expect(findNamed('tell anna I am late', chats).rest).toBe('')
  })
})
