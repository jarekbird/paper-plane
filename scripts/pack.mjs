import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { loadEnv } from 'vite'
import { storeCheck } from './store-check.mjs'

const OUT = 'build/pack'
const FILE = 'build/paper-plane.ehpk'

export function parts(folder) {
  const env = loadEnv('production', folder, 'VITE_')
  return {
    telegram: Boolean(env.VITE_TELEGRAM_API_ID && env.VITE_TELEGRAM_API_HASH),
    voice: Boolean(env.VITE_RELAY),
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const has = parts(process.cwd())
  const { version } = JSON.parse(readFileSync('app.json', 'utf8'))
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync('build', { recursive: true })
  execFileSync('npx', ['vite', 'build', '--outDir', OUT], { stdio: 'inherit' })
  const { problems } = storeCheck(OUT)
  if (problems.length) {
    console.error(`S2: the pack breaks ${problems.length} store rules:`)
    for (const problem of problems) console.error(`  ${problem}`)
    process.exit(1)
  }
  execFileSync('npx', ['evenhub', 'pack', 'app.json', OUT, '-o', FILE], { stdio: 'inherit' })
  console.log(
    `Packed ${FILE}, version ${version}: Telegram ${has.telegram ? 'in' : 'NOT in (sample chats only)'}, voice ${has.voice ? 'on' : 'NOT set up'}.`,
  )
}
