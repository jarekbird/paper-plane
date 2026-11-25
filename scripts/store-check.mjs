import { checkApp } from 'earshot/check'

export const NOT_DESTINATIONS = [
  { url: 'demo://local', why: 'the sample account, which never leaves the app' },
  { url: 'http://\u0000', why: 'the Telegram library reads a host name out of an address with it; nothing is requested' },
  { url: 'tg://', why: 'the Telegram library tells a Telegram link by this prefix' },
  { url: 'tg://\u0000\u0000', why: 'the Telegram library can print a Telegram link; the app never does' },
  { url: 'tg://user?id=\u0000&hash=\u0000', why: 'the Telegram library can print a link to a person; the app never does' },
  { url: 'tg://login?token=\u0000', why: 'the Telegram library can print a QR sign-in link; the app has no QR sign-in' },
]

export function storeCheck(dist) {
  return checkApp({ dist, allow: NOT_DESTINATIONS.map(entry => entry.url) })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dist = process.argv[2] ?? 'dist'
  const { problems, files, whitelist } = storeCheck(dist)
  if (problems.length) {
    console.error(`S2: app.json and ${dist} break ${problems.length} store rules:`)
    for (const problem of problems) console.error(`  ${problem}`)
    process.exit(1)
  }
  console.log(
    `S2: app.json follows the store rules, and no address in ${files} built files of ${dist} is outside the whitelist (${whitelist.join(', ')}).`,
  )
}
