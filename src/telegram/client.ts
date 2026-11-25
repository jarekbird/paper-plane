import type { Lifetime } from 'earshot'
import { MemoryStorage, TelegramClient } from '@mtcute/web'
import type { Account, Messenger } from '../messenger.ts'
import { accountOver, type SessionPlace } from './account.ts'
import { messengerOver } from './messenger.ts'

export interface TelegramApp {
  apiId: number
  apiHash: string
}

export function telegram(life: Lifetime, app: TelegramApp, place: SessionPlace): { account: Account; messenger: Messenger } {
  const client = new TelegramClient({ apiId: app.apiId, apiHash: app.apiHash, storage: new MemoryStorage() })
  const messenger = messengerOver(client)
  life.own(() => {
    messenger.close()
    void client.destroy()
  })
  return { account: accountOver(life, client, place), messenger }
}
