export interface Launch {
  said: string[] | null
  trace: boolean
  own: 'telegram' | 'sample' | 'none'
  trouble: Staged | null
}

export type Staged = 'unreachable' | 'wait' | 'ended'

const STAGED: readonly string[] = ['unreachable', 'wait', 'ended']

export function launch(fragment: string, app: { id?: string | undefined; hash?: string | undefined }): Launch {
  const flags = new URLSearchParams(fragment.replace(/^#/, ''))
  const own = flags.get('account') === 'sample' ? 'sample' : app.id && app.hash ? 'telegram' : 'none'
  const asked = flags.get('trouble')
  const trouble = own !== 'telegram' && asked !== null && STAGED.includes(asked) ? (asked as Staged) : null
  return { said: flags.get('say')?.split('|') ?? null, trace: flags.has('trace') && own !== 'telegram', own, trouble }
}
