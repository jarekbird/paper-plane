import { TroubleError } from './messenger.ts'

export const UNREACHABLE = 'Cannot reach Telegram'

const UNITS: [size: number, one: string, many: string][] = [
  [86_400, 'day', 'days'],
  [3_600, 'hour', 'hours'],
  [60, 'minute', 'minutes'],
  [1, 'second', 'seconds'],
]

export function span(seconds: number): string {
  const whole = Math.max(1, Math.ceil(seconds))
  const [size, one, many] = UNITS.find(([least]) => whole >= least) ?? UNITS[3]
  const count = Math.ceil(whole / size)
  return `${count} ${count === 1 ? one : many}`
}

export function troubleWords(error: unknown, otherwise: string): string {
  if (!(error instanceof TroubleError)) return otherwise
  return error.trouble.kind === 'wait' ? `Telegram says wait ${span(error.trouble.seconds)}` : UNREACHABLE
}
