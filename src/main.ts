import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { Glasses, Lifetime, scriptedSpeech } from 'earshot'
import { DEMO_PICKS, demoDrafter, demoMessenger } from './demo/messenger.ts'
import { startGlasses } from './glasses/app.ts'
import { Inbox } from './inbox.ts'
import { startPhone } from './phone/page.ts'
import { appStore } from './store.ts'

const flags = new URLSearchParams(location.hash.slice(1))
const said = flags.get('say')?.split('|')

const life = new Lifetime()
const bridge = await waitForEvenAppBridge()
const messenger = demoMessenger()
const inbox = new Inbox(life, messenger, appStore(bridge))
await inbox.start()
if (inbox.fresh) await inbox.pick(DEMO_PICKS)

startGlasses(life, new Glasses(life, bridge, { trace: flags.has('trace') }), {
  inbox,
  messenger,
  drafter: demoDrafter,
  ...(said ? { hearing: { transcribe: scriptedSpeech(said) } } : {}),
})
startPhone(life, document.getElementById('app')!, inbox, 'These are sample chats. Pick the ones you want on your glasses.')
