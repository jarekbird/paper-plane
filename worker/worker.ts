import { relay, relayOptions } from 'earshot/relay'
import { google } from './google.ts'
import { pairsIn, type PairNamespace } from './pairs.ts'

export { PairStore } from './pairs.ts'

export interface Env {
  OPENROUTER_KEY: string
  UPSTREAM: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  PAIRS?: PairNamespace
}

export default {
  fetch: async (request: Request, env: Env): Promise<Response> => {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PAIRS } = env
    const signIn = await google(request, { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ...(PAIRS ? { PAIRS: pairsIn(PAIRS) } : {}) })
    return signIn ?? relay(relayOptions({ key: env.OPENROUTER_KEY, upstream: env.UPSTREAM, models: undefined }))(request)
  },
}
