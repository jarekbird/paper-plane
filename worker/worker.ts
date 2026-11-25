import { relay, relayOptions } from 'earshot/relay'

export interface Env {
  OPENROUTER_KEY: string
  UPSTREAM: string
}

export default {
  fetch: (request: Request, env: Env): Promise<Response> =>
    relay(relayOptions({ key: env.OPENROUTER_KEY, upstream: env.UPSTREAM, models: undefined }))(request),
}
