import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { Lifetime, scriptedSpeech } from 'earshot'
import { startApp } from './app.ts'
import { demoAccount } from './demo/account.ts'
import { demoCalendarAccount } from './demo/calendar-account.ts'
import { demoCalendar } from './demo/calendar.ts'
import { DEMO_PICKS, demoMessenger } from './demo/messenger.ts'
import { stage } from './demo/trouble.ts'
import { demoWriter } from './demo/writer.ts'
import { display } from './glasses/display.ts'
import { googleAccount } from './google/account.ts'
import { calendarOver } from './google/calendar.ts'
import { launch } from './launch.ts'
import { startPhone } from './phone/page.ts'
import { appStore } from './store.ts'
import { hearingThrough } from './voice/hearing.ts'
import { writerThrough } from './voice/writer.ts'

const id = import.meta.env.VITE_TELEGRAM_API_ID
const hash = import.meta.env.VITE_TELEGRAM_API_HASH
const relay = import.meta.env.VITE_RELAY
const how = launch(location.hash, { id, hash, relay, google: import.meta.env.VITE_GOOGLE_CALENDAR })
const hearing = how.said ? { transcribe: scriptedSpeech(how.said) } : relay ? hearingThrough(relay) : undefined
const writer = how.said ? demoWriter() : relay ? writerThrough(relay) : undefined

const life = new Lifetime()
const bridge = await waitForEvenAppBridge()
const { store, sessions, google } = appStore(bridge)

const samples = demoMessenger()

async function ownAccount() {
  if (how.own === 'sample') {
    const account = demoAccount({ signedIn: how.trouble === 'ended' })
    const messenger = demoMessenger()
    if (how.trouble) stage(life, how.trouble, { messengers: [samples, messenger], account })
    return { account, messenger }
  }
  if (how.trouble) stage(life, how.trouble, { messengers: [samples] })
  if (!id || !hash) return undefined
  const { telegram } = await life.guard(import('./telegram/client.ts'))
  return telegram(life, { apiId: Number(id), apiHash: hash }, sessions)
}

const own = await ownAccount()

function ownCalendar() {
  if (how.calendar === 'sample') {
    const sample = demoCalendar()
    return { account: demoCalendarAccount({ connected: false }), calendar: () => sample }
  }
  if (how.calendar !== 'google' || !relay) return undefined
  const account = googleAccount(life, { relay, place: google })
  return { account, calendar: () => calendarOver(life, account) }
}

const calendar = ownCalendar()
await startApp({
  life,
  display: display(life, bridge, { trace: how.trace }),
  store,
  sample: { messenger: samples, picks: DEMO_PICKS },
  ...(own ? { telegram: own } : {}),
  ...(hearing ? { hearing } : {}),
  ...(writer ? { writer } : {}),
  calendar: { sample: demoCalendar(), ...(calendar ? { own: calendar } : {}) },
  build: { telegram: how.own === 'telegram', voice: Boolean(relay) && !how.said, calendar: Boolean(calendar) },
  phone: (session, parts) => startPhone(session, document.getElementById('app')!, parts),
})
