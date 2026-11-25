import { MemoryStorage } from '@mtcute/web'
import { LogManager } from '@mtcute/web/utils.js'

export interface TelegramApp {
  apiId: number
  apiHash: string
}

export const clientOptions = (app: TelegramApp) => ({
  apiId: app.apiId,
  apiHash: app.apiHash,
  storage: new MemoryStorage(),
  logLevel: LogManager.OFF,
})
