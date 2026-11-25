import { MemoryStorage } from '@mtcute/core'
import { LogManager } from '@mtcute/core/utils.js'
import { WebCryptoProvider, WebPlatform } from '@mtcute/web'
import { webSockets } from './transport.ts'

export interface TelegramApp {
  apiId: number
  apiHash: string
}

export const clientOptions = (app: TelegramApp) => ({
  apiId: app.apiId,
  apiHash: app.apiHash,
  storage: new MemoryStorage(),
  logLevel: LogManager.OFF,
  crypto: new WebCryptoProvider(),
  platform: new WebPlatform(),
  transport: webSockets,
})
