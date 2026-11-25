import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { Lifetime, scriptedSpeech } from 'earshot'
import { startApp } from './app.ts'
import { demoAccount } from './demo/account.ts'
import { DEMO_PICKS, demoMessenger } from './demo/messenger.ts'
import { display } from './glasses/display.ts'
import { launch } from './launch.ts'
import { startPhone } from './phone/page.ts'
import { appStore, sessionPlace } from './store.ts'

const id = import.meta.env.VITE_TELEGRAM_API_ID
const hash = import.meta.env.VITE_TELEGRAM_API_HASH
const how = launch(location.hash, { id, hash })

const life = new Lifetime()
const bridge = await waitForEvenAppBridge()
const store = appStore(bridge)

async function ownAccount() {
  if (how.own === 'sample') return { account: demoAccount({ signedIn: false }), messenger: demoMessenger() }
  if (!id || !hash) return undefined
  const { telegram } = await life.guard(import('./telegram/client.ts'))
  return telegram(life, { apiId: Number(id), apiHash: hash }, sessionPlace(store))
}

const own = await ownAccount()
await startApp({
  life,
  display: display(life, bridge, { trace: how.trace }),
  store,
  sample: { messenger: demoMessenger(), picks: DEMO_PICKS },
  ...(own ? { telegram: own } : {}),
  ...(how.said ? { hearing: { transcribe: scriptedSpeech(how.said) } } : {}),
  phone: (session, parts) => startPhone(session, document.getElementById('app')!, parts),
})
