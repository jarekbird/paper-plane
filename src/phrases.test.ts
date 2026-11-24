import { cleanText, createStore, memoryPlace } from 'earshot'
import { describe, expect, it } from 'vitest'
import { Phrases } from './phrases.ts'

describe('the user’s own quick replies', () => {
  it('are kept for the next launch', async () => {
    const store = createStore([memoryPlace()])
    const phrases = new Phrases(store)
    await phrases.start()
    await phrases.add('In a meeting, back at three')
    const next = new Phrases(store)
    await next.start()
    expect(next.list()).toEqual(['In a meeting, back at three'])
  })

  it('take a phrase once, tidy its spaces, and ignore an empty one', async () => {
    const phrases = new Phrases(createStore([memoryPlace()]))
    await phrases.add('  Call you   later ')
    await phrases.add('call you later')
    await phrases.add('   ')
    expect(phrases.list()).toEqual(['Call you later'])
  })

  it('S5: are kept exactly as the glasses can show them, so a row never hides what it sends', async () => {
    const store = createStore([memoryPlace()])
    await store.set('phrases', JSON.stringify(['Saved before\u200b this rule']))
    const phrases = new Phrases(store)
    await phrases.start()
    await phrases.add('Email alice\u200b@example.com')
    await phrases.add('Run `npm test` first')
    expect(phrases.list()).toEqual(['Saved before this rule', 'Email alice@example.com', cleanText('Run `npm test` first')])
    expect(phrases.list()[2]).not.toContain('`')
  })

  it('stop at twelve, so the list on the glasses stays short', async () => {
    const phrases = new Phrases(createStore([memoryPlace()]))
    for (let n = 1; n <= 14; n++) await phrases.add(`Phrase ${n}`)
    expect(phrases.list()).toHaveLength(12)
  })

  it('can be removed, and tell the page', async () => {
    const phrases = new Phrases(createStore([memoryPlace()]))
    let told = 0
    phrases.onChange(() => told++)
    await phrases.add('Call you later')
    await phrases.remove('Call you later')
    expect(phrases.list()).toEqual([])
    expect(told).toBe(2)
  })
})
