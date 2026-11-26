export interface Launch {
  said: string[] | null
  trace: boolean
  own: 'telegram' | 'sample' | 'none'
  calendar: 'google' | 'sample' | 'none'
  trouble: Staged | null
}

export interface Built {
  id?: string | undefined
  hash?: string | undefined
  relay?: string | undefined
  google?: string | undefined
}

export type Staged = 'unreachable' | 'wait' | 'ended'

const STAGED: readonly string[] = ['unreachable', 'wait', 'ended']

export function launch(fragment: string, app: Built): Launch {
  const flags = new URLSearchParams(fragment.replace(/^#/, ''))
  const own = flags.get('account') === 'sample' ? 'sample' : app.id && app.hash ? 'telegram' : 'none'
  const asked = flags.get('trouble')
  const trouble = own !== 'telegram' && asked !== null && STAGED.includes(asked) ? (asked as Staged) : null
  const said = flags.get('say')?.split('|') ?? null
  const calendar = own === 'sample' ? 'sample' : app.relay && app.google === 'on' && said === null ? 'google' : 'none'
  return { said, trace: flags.has('trace') && own !== 'telegram', own, calendar, trouble }
}
