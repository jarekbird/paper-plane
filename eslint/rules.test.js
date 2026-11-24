import path from 'node:path'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')
const fixtures = path.join(import.meta.dirname, 'fixtures', 'src')
const untyped = { files: ['src/**'], languageOptions: { parserOptions: { projectService: false } } }
const syntax = new ESLint({ cwd: root, overrideConfig: [{ ...untyped, rules: { 'plane/awaits': 'off' } }] })
const ids = messages => [
  ...new Set(messages.filter(m => m.ruleId?.startsWith('plane/')).map(m => m.message.match(/^([A-Z]\d(, [A-Z]\d)*):/)?.[1] ?? m.message)),
]
const lint = async (eslint, file, code) => {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, file) })
  const fatal = result.messages.find(m => m.fatal)
  if (fatal) throw new Error(fatal.message)
  return ids(result.messages).sort()
}
const cases = (list, eslint = syntax) =>
  Promise.all(list.map(async ([file, code, want]) => expect([file, code, await lint(eslint, file, code)]).toEqual([file, code, want])))

describe('architecture checks (ESLint)', () => {
  it('A1: a service imports no UI folder', () =>
    cases([
      ['src/telegram/a.ts', "import { x } from '../glasses/app.ts'", ['A1']],
      ['src/google/a.ts', "import '../phone/page.ts'", ['A1']],
      ['src/voice/a.ts', "export * from '../phone/page'", ['A1']],
      ['src/demo/a.ts', "const p = await import('../glasses/app')", ['A1']],
      ['src/demo/a.ts', "export { page } from '../phone/page'", ['A1']],
      ['src/telegram/a.ts', "type T = import('../glasses/app').Chats", ['A1']],
      ['src/telegram/a.ts', "import type { Messenger } from '../messenger.ts'", []],
      ['src/telegram/a.test.ts', "import { x } from '../glasses/app.ts'", []],
      ['src/demo/a.ts', 'const m = await import(name)', ['A1', 'A2', 'A3']],
    ]))
  it("A1: a service imports none of Earshot's screens", () =>
    cases([
      ['src/telegram/a.ts', "import { Router } from 'earshot'", ['A1']],
      ['src/telegram/a.ts', "import type { Screen } from 'earshot'", ['A1']],
      ['src/demo/a.ts', "import { list as rows } from 'earshot'", ['A1']],
      ['src/voice/a.ts', "import { Lifetime, type Audio } from 'earshot'", []],
      ['src/voice/a.ts', "import * as earshot from 'earshot'", ['A1']],
      ['src/google/a.ts', "export * from 'earshot'", ['A1']],
      ['src/google/a.ts', "export { Shell as S } from 'earshot'", ['A1']],
      ['src/google/a.ts', "export { Lifetime } from 'earshot'", []],
      ['src/demo/a.ts', "const e = await import('earshot')", ['A1']],
      ['src/demo/a.ts', "type G = import('earshot').Glasses", ['A1']],
      ['src/demo/a.ts', "type L = import('earshot').Lifetime", []],
      ['src/demo/a.ts', "type E = typeof import('earshot')", ['A1']],
      ['src/inbox.ts', "import { Router } from 'earshot'", []],
    ]))
  it('A2: UI reaches a service only through src/messenger.ts', () =>
    cases([
      ['src/glasses/a.ts', "import { client } from '../telegram/client.ts'", ['A2']],
      ['src/phone/a.ts', "import type { Mail } from '../google/mail'", ['A2']],
      ['src/phone/a.ts', "const v = await import('../voice/relay')", ['A2']],
      ['src/glasses/a.ts', "import { demoMessenger } from '../demo/messenger.ts'", ['A2']],
      ['src/glasses/a.ts', "import type { Messenger } from '../messenger.ts'", []],
      ['src/glasses/a.test.ts', "import { demoMessenger } from '../demo/messenger.ts'", []],
      ['src/main.ts', "import { demoMessenger } from './demo/messenger.ts'", []],
      ['src/phone/a.ts', "import { TelegramClient } from '@mtcute/web'", ['A2']],
      ['src/inbox.ts', "import type { Message } from '@mtcute/core'", ['A2']],
      ['src/google/a.ts', "import { TelegramClient } from '@mtcute/web'", ['A2']],
      ['src/telegram/a.ts', "import { TelegramClient } from '@mtcute/web'", []],
    ]))
  it('A2: only src/telegram, src/google and src/voice touch the network', () =>
    cases([
      ['src/glasses/a.ts', "await fetch('https://x')", ['A2']],
      ['src/demo/a.ts', 'await fetch(u)', ['A2']],
      ['src/telegram/a.ts', 'await fetch(u, { signal: life.signal })', []],
      ['src/phone/a.ts', 'await window.fetch(u)', ['A2']],
      ['src/phone/a.ts', "await window['fet' + 'ch'](u)", ['A2']],
      ['src/phone/a.ts', 'const { fetch: get } = globalThis', ['A2', 'A2, A3, A4']],
      ['src/phone/a.ts', 'navigator.sendBeacon(u, body)', ['A2']],
      ['src/main.ts', 'const request = new XMLHttpRequest()', ['A2']],
      ['src/inbox.ts', 'life.own(close(new EventSource(u)))', ['A2']],
      ['src/google/a.ts', 'life.own(close(new WebSocket(u)))', []],
      ['src/phone/a.ts', '// fetch the next page\nconst label = "fetch"', ['A2']],
      ['src/phone/a.ts', 'const label = "loading, then fetching"', []],
    ]))
  it('A3: only src/main.ts imports the Even SDK', () =>
    cases([
      ['src/glasses/a.ts', "import { x } from '@evenrealities/even_hub_sdk'", ['A3']],
      ['src/store.ts', "import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'", ['A3']],
      ['src/telegram/a.ts', "const sdk = await import('@evenrealities/even_hub_sdk')", ['A3']],
      ['src/main.ts', "import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'", []],
    ]))
  it('A3: the app never draws, reads input or records through the bridge', () =>
    cases([
      ['src/main.ts', 'await bridge.rebuildPageContainer(page)', ['A3']],
      ['src/glasses/a.ts', 'await bridge.audioControl(true)', ['A3']],
      ['src/store.ts', 'await bridge.audioControl(true)', ['A3']],
      ['src/glasses/a.ts', 'life.own(bridge.onEvenHubEvent(handler))', ['A3']],
      ['src/main.ts', 'const { textContainerUpgrade } = bridge', ['A3']],
      ['src/phone/a.ts', "await bridge['audio' + 'Control'](true)", ['A3']],
      ['src/phone/a.ts', "await bridge['audioControl' as const](true)", ['A3']],
      ['src/phone/a.ts', "await bridge[('audioControl' satisfies string)](true)", ['A3']],
      ['src/phone/a.ts', "Reflect.get(bridge, 'audioControl')", ['A2, A3, A4', 'A3']],
      ['src/glasses/a.ts', 'glasses.draw(frame)', []],
    ]))
  it('A3: only src/store.ts stores', () =>
    cases([
      ['src/glasses/a.ts', "await bridge.setLocalStorage('k', v)", ['A3']],
      ['src/store.ts', "await bridge.getLocalStorage('k')", []],
      ['src/glasses/a.ts', "localStorage.setItem('k', v)", ['A3']],
      ['src/telegram/a.ts', "const db = indexedDB.open('session')", ['A3']],
      ['src/phone/a.ts', 'sessionStorage.clear()', ['A3']],
      ['src/phone/a.ts', "document.cookie = 'k=v'", ['A3']],
      ['src/phone/a.ts', "const s = window['local' + 'Storage']", ['A3']],
      ['src/google/a.ts', 'const dir = await navigator.storage.getDirectory()', ['A3']],
      ['src/store.ts', "localStorage.removeItem('k')", []],
      ['src/glasses/a.ts', 'const label = "stored on your phone"', []],
    ]))
  it('A4: no bare timer or listener', () =>
    cases([
      ['src/telegram/a.ts', 'setInterval(() => {}, 1000)', ['A4']],
      ['src/glasses/a.ts', 'const id = setTimeout(run, ms)', ['A4']],
      ['src/glasses/a.ts', 'requestAnimationFrame(draw)', ['A4']],
      ['src/phone/a.ts', "window.addEventListener('resize', f)", ['A4']],
      ['src/phone/a.ts', "button.addEventListener('click', f)", ['A4']],
      ['src/glasses/a.ts', 'const later = window.setTimeout', ['A4']],
      ['src/glasses/a.ts', "const later = window['set' + 'Timeout']", ['A4']],
      ['src/glasses/a.ts', 'life.timeout(run, 1000)\nlife.interval(run, 1000)', []],
      ['src/phone/a.ts', "life.listen(button, 'click', f)", []],
      ['src/phone/a.ts', "life.listen(window, 'online', f)", []],
      ['src/phone/a.ts', "listen(window, 'online', f)", ['A2, A3, A4']],
      ['src/phone/a.ts', 'const w = window', ['A2, A3, A4']],
      ['src/glasses/a.test.ts', 'setTimeout(done, 10)', []],
    ]))
  it('A4: a socket is opened inside life.own(...)', () =>
    cases([
      ['src/voice/a.ts', 'const s = new WebSocket(url)', ['A4']],
      ['src/voice/a.ts', 'life.own(close(new WebSocket(url)))', []],
      ['src/voice/a.ts', 'life.own(() => {})\nconst s = new WebSocket(url)', ['A4']],
      ['src/voice/a.ts', 'life.own(\n  close(\n    new WebSocket(url),\n  ),\n)', []],
      ['src/voice/a.ts', 'const Socket = WebSocket\nlife.own(close(new Socket(url)))', ['A4']],
      ['src/voice/a.ts', 'life.own(() => new WebSocket(url).close())', ['A4']],
      ['src/voice/a.ts', 'life.own(close(new globalThis.WebSocket(url)))', []],
      ['src/voice/a.ts', 'life.own(close(new (WebSocket as typeof WebSocket)(url)))', []],
      ['src/voice/a.ts', "const s = new globalThis['WebSocket'](url)", ['A4']],
      ['src/voice/a.ts', "life.own(close(new globalThis['WebSocket'](url)))", []],
      ['src/voice/a.ts', 'let socket: WebSocket | null = null', []],
      ['src/google/a.ts', 'const events = new EventSource(url)', ['A4']],
    ]))
  it('A4: the handle of a subscription is kept or owned, never dropped', () =>
    cases([
      ['src/inbox.ts', 'messenger.onChange(refresh)', ['A4']],
      ['src/inbox.ts', 'void glasses.onMic(told)', ['A4']],
      ['src/glasses/a.ts', 'router?.onChange(draw)', ['A4']],
      ['src/glasses/a.ts', 'glasses.onInput!(log)', ['A4']],
      ['src/glasses/a.ts', "feed['subscribe'](draw)", ['A4']],
      ['src/inbox.ts', 'life.own(messenger.onChange(refresh))', []],
      ['src/inbox.ts', 'const stop = messenger.onChange(refresh)', []],
      ['src/messenger.ts', 'export interface Messenger {\n  onChange(told: () => void): () => void\n}', []],
      ['src/inbox.ts', 'export class Inbox {\n  onChange(told) {\n    return () => told\n  }\n}', []],
    ]))
  it('A5: code that owns a Lifetime awaits only through it', async () => {
    const typed = new ESLint({ cwd: root, ignore: false })
    const results = await typed.lintFiles([fixtures])
    const got = Object.fromEntries(
      results
        .filter(r => r.messages.length)
        .map(r => [
          path.relative(fixtures, r.filePath).split(path.sep).join('/'),
          r.messages.map(m => `${m.line} ${ids([m])[0] ?? m.message}`),
        ]),
    )
    expect(got).toEqual({
      'telegram/a1.ts': ['1 A1'],
      'voice/a5.ts': ['9 A5', '17 A5', '17 A5', '21 A5', '25 A5', '37 A5'],
      'glasses/a5.ts': ['7 A5'],
    })
  }, 60_000)
  it('A5: fails when it is run without types, instead of passing', () =>
    cases([['src/voice/a.ts', 'export {}', ['A5']]], new ESLint({ cwd: root, overrideConfig: [untyped] })))
  it('C3: no copy-and-paste flows', () =>
    cases([
      ['src/phone/a.ts', 'await navigator.clipboard.writeText(code)', ['C3']],
      ['src/phone/a.ts', "document.execCommand('copy')", ['C3']],
      ['src/phone/a.ts', 'const label = "Copy the code"', []],
    ]))
  it('disable comments cannot switch a check off', () =>
    cases([
      ['src/phone/a.ts', '// eslint-disable-next-line\nfetch(u)', ['A2']],
      ['src/phone/a.ts', '/* eslint-disable plane/names */\nfetch(u)', ['A2']],
    ]))
})
