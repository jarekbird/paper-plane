import { openRouter, type OpenRouter } from 'earshot'

export function hearingThrough(relay: string, ask?: typeof fetch): Pick<OpenRouter, 'transcribe' | 'model'> {
  if (new URL(relay).protocol !== 'https:') throw new Error('The voice relay must be an https address')
  const service = openRouter({ host: relay, language: 'en', ...(ask ? { fetch: ask } : {}) })
  return { transcribe: service.transcribe, model: service.model }
}
