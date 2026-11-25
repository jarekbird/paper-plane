import { LifetimeEnded, openRouter, RelayError, SayError, type OpenRouter } from 'earshot'

function plain(error: unknown): unknown {
  if (error instanceof LifetimeEnded) return error
  if (error instanceof SayError) return new SayError(error.say, error.status === undefined ? {} : { status: error.status })
  return new Error(error instanceof RelayError ? `The voice relay answered ${error.status}` : 'The voice relay failed')
}

const told = <T>(work: Promise<T>): Promise<T> =>
  work.catch((error: unknown) => {
    throw plain(error)
  })

export function hearingThrough(relay: string, ask?: typeof fetch): Pick<OpenRouter, 'transcribe' | 'model'> {
  if (new URL(relay).protocol !== 'https:') throw new Error('The voice relay must be an https address')
  const service = openRouter({ host: relay, language: 'en', ...(ask ? { fetch: ask } : {}) })
  return {
    transcribe: (audio, life) => told(service.transcribe(audio, life)),
    model: { choose: (question, life) => told(service.model.choose(question, life)) },
  }
}
