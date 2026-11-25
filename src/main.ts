import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { Lifetime, scriptedSpeech } from 'earshot'
import { startApp } from './app.ts'
import { demoAccount } from './demo/account.ts'
import { DEMO_PICKS, demoMessenger } from './demo/messenger.ts'
import { display } from './glasses/display.ts'
import { startPhone } from './phone/page.ts'
import { appStore, sessionPlace } from './store.ts'

const flags = new URLSearchParams(location.hash.slice(1))
const said = flags.get('say')?.split('|')
const id = import.meta.env.VITE_TELEGRAM_API_ID
const hash = import.meta.env.VITE_TELEGRAM_API_HASH

const life = new Lifetime()
const bridge = await waitForEvenAppBridge()
const store = appStore(bridge)

async function ownAccount() {
  if (flags.get('account') === 'sample') return { account: demoAccount({ signedIn: false }), messenger: demoMessenger() }
  if (!id || !hash) return undefined
  const { telegram } = await life.guard(import('./telegram/client.ts'))
  return telegram(life, { apiId: Number(id), apiHash: hash }, sessionPlace(store))
}

const own = await ownAccount()
await startApp({
  life,
  display: display(life, bridge, { trace: flags.has('trace') }),
  store,
  sample: { messenger: demoMessenger(), picks: DEMO_PICKS },
  ...(own ? { telegram: own } : {}),
  ...(said ? { hearing: { transcribe: scriptedSpeech(said) } } : {}),
  phone: (session, parts) => startPhone(session, document.getElementById('app')!, parts),
})
