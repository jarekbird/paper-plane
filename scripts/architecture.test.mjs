import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { architecture } from '../eslint.config.js'
import { collectEdges, difference, DOC, END, MAP, moduleOf, render, ruleIds, splice, START, violations } from './architecture.mjs'

const REPO = path.resolve(import.meta.dirname, '..')
const fixtures = path.join(REPO, 'eslint/fixtures/src')
const roots = []
const copy = (change = () => {}, rules = architecture) => {
  const root = mkdtempSync(path.join(tmpdir(), 'paper-plane-arch-'))
  roots.push(root)
  mkdirSync(path.join(root, 'docs'))
  for (const file of ['CLAUDE.md', MAP]) cpSync(path.join(REPO, file), path.join(root, file))
  cpSync(path.join(REPO, '.claude/skills'), path.join(root, '.claude/skills'), { recursive: true })
  mkdirSync(path.join(root, '.agents'))
  symlinkSync('CLAUDE.md', path.join(root, 'AGENTS.md'))
  symlinkSync('../.claude/skills', path.join(root, '.agents/skills'))
  change(root)
  return violations(root, rules)
}
const edit = (file, change) => root => writeFileSync(path.join(root, file), change(readFileSync(path.join(root, file), 'utf8')))

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('the framework holds together (G3)', () => {
  it('holds in this repository', () => {
    expect(violations(REPO, architecture)).toEqual([])
    expect(copy()).toEqual([])
  })
  it('AGENTS.md and .agents/skills are links, so Codex reads the same rules and skills as Claude', () => {
    const copied = root => {
      rmSync(path.join(root, 'AGENTS.md'))
      cpSync(path.join(root, 'CLAUDE.md'), path.join(root, 'AGENTS.md'))
    }
    expect(copy(copied)).toEqual(['G3 AGENTS.md: must be a symbolic link to CLAUDE.md'])
    expect(copy(root => rmSync(path.join(root, '.agents/skills')))).toEqual([
      'G3 .agents/skills: must be a symbolic link to ../.claude/skills',
    ])
  })
  it('every skill CLAUDE.md names exists', () => {
    expect(copy(root => rmSync(path.join(root, '.claude/skills/develop'), { recursive: true }))).toEqual([
      'G3 CLAUDE.md: names skill develop, which .claude/skills lacks',
    ])
  })
  it('every rule has a row in the test map, so a rule with no check says so', () => {
    expect(ruleIds('- **A1** One.\n- **S12** Two.\n- not **B1** a rule')).toEqual(['A1', 'S12'])
    expect(copy(edit('CLAUDE.md', text => `${text}\n- **Z9** A new rule.\n`))).toEqual([
      `G3 ${MAP}: has no row for rule Z9: name its check, or say "no check yet"`,
    ])
    expect(copy(edit(MAP, text => `${text}\n| **Z9** | a check |\n`))).toEqual([
      `G3 ${MAP}: has a row for Z9, which is not a rule in CLAUDE.md`,
    ])
  })
  it('a check cites only rules that exist', () => {
    const stale = { ...architecture, 'plane/opaque': ['error', [{ id: 'A2, P9', from: ['src'] }]] }
    expect(copy(undefined, stale)).toEqual(['G3 eslint.config.js: cites P9, which is not a rule in CLAUDE.md'])
  })
})

describe('module map', () => {
  it('groups files by their folder under src, and keeps top-level files and the named packages as their own', () => {
    expect(moduleOf('src/phone/tabs/chats.ts')).toBe('src/phone')
    expect(moduleOf('src/messenger.ts')).toBe('src/messenger.ts')
    expect(moduleOf('@evenrealities/even_hub_sdk')).toBe('@evenrealities/even_hub_sdk')
    expect(moduleOf('earshot/testing')).toBe('earshot')
    expect(moduleOf('@mtcute/web')).toBe('@mtcute')
    expect(moduleOf('vitest')).toBeNull()
    expect(moduleOf('package.json')).toBeNull()
  })
  it('renders the same text whatever order the edges arrive in', () => {
    const edges = [
      ['src/telegram', 'src/messenger.ts'],
      ['src/glasses', 'src/messenger.ts'],
      ['src/glasses', 'earshot'],
    ]
    expect(render(edges, architecture)).toBe(render([...edges].reverse(), architecture))
    expect(render(edges, architecture)).toContain(
      '  src_glasses --> earshot\n  src_glasses --> src_messenger_ts\n  src_telegram --> src_messenger_ts\n',
    )
  })
  it('lists the import boundaries the checks enforce, with their rule IDs', () => {
    const text = render([], architecture)
    expect(text).toContain('- **A1** src/telegram, src/google, src/voice, src/demo must not import src/glasses, src/phone.')
    expect(text).toContain('- **A3** src (but not src/main.ts) must not import @evenrealities/even_hub_sdk.')
    expect(text).toMatch(/- \*\*A1\*\* .* must not import Router, Shell, .* from earshot\./)
  })
  it('collects the folder import that ESLint reports as an A1 violation, and leaves tests out', async () => {
    const edges = await collectEdges([fixtures])
    expect(edges).toContainEqual(['src/telegram', 'src/glasses'])
    expect(edges).toContainEqual(['src/voice', 'earshot'])
    expect(edges.filter(([from]) => from === 'src/glasses')).toEqual([['src/glasses', 'earshot']])
  })
  it('finds a stale committed map', () => {
    const doc = readFileSync(path.join(REPO, DOC), 'utf8')
    const stale = splice(doc, render([['src/telegram', 'src/glasses']], architecture))
    expect(stale).not.toBe(doc)
    expect(difference(doc, stale)).toContain('+   src_telegram --> src_glasses')
    expect(() => splice(doc.replace(END, ''), 'x')).toThrow(START)
  })
})
