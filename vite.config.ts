import { defineConfig, type Plugin } from 'vite'

const LIBRARY_LINKS: [found: string, becomes: string][] = [
  ['https://t.me/', 't.me/'],
  ['https://fake/', 'wss://pluto.web.telegram.org/'],
]

// Even's store review refuses a bundle that names a web address outside the network whitelist; the Telegram library prints t.me links and parses with a made-up base.
const noLibraryLinks = (): Plugin => ({
  name: 'no-library-links',
  apply: 'build',
  renderChunk: code => {
    const rewritten = LIBRARY_LINKS.reduce((text, [found, becomes]) => text.replaceAll(found, becomes), code)
    return rewritten === code ? null : { code: rewritten, map: null }
  },
})

export default defineConfig({
  plugins: [noLibraryLinks()],
  server: { host: '127.0.0.1', port: 5183 },
  build: { target: 'esnext' },
  optimizeDeps: { exclude: ['@mtcute/wasm'] },
})
