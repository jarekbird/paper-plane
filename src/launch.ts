export interface Launch {
  said: string[] | null
  trace: boolean
  own: 'telegram' | 'sample' | 'none'
}

export function launch(fragment: string, app: { id?: string | undefined; hash?: string | undefined }): Launch {
  const flags = new URLSearchParams(fragment.replace(/^#/, ''))
  const own = flags.get('account') === 'sample' ? 'sample' : app.id && app.hash ? 'telegram' : 'none'
  return { said: flags.get('say')?.split('|') ?? null, trace: flags.has('trace') && own !== 'telegram', own }
}
