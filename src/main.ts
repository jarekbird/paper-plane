import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { Glasses, Lifetime, scriptedSpeech } from 'earshot'
import { DEMO_PICKS, demoMessenger } from './demo/messenger.ts'
import { startGlasses } from './glasses/app.ts'
import { Inbox } from './inbox.ts'
import { startPhone } from './phone/page.ts'
import { Phrases } from './phrases.ts'
import { appStore } from './store.ts'

const flags = new URLSearchParams(location.hash.slice(1))
const said = flags.get('say')?.split('|')

const life = new Lifetime()
const bridge = await waitForEvenAppBridge()
const messenger = demoMessenger()
const store = appStore(bridge)
const inbox = new Inbox(life, messenger, store)
const phrases = new Phrases(store)
await inbox.start()
await phrases.start()
if (inbox.fresh) await inbox.pick(DEMO_PICKS)

startGlasses(life, new Glasses(life, bridge, { trace: flags.has('trace') }), {
  inbox,
  messenger,
  phrases,
  ...(said ? { hearing: { transcribe: scriptedSpeech(said) } } : {}),
})
startPhone(life, document.getElementById('app')!, {
  inbox,
  phrases,
  note: 'These are sample chats. Pick the ones you want on your glasses.',
})
