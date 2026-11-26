import { createStore, evenPlace, webPlace, type EvenStorage, type Place, type Store } from 'earshot'

const SESSION_KEY = 'telegram-session'
const GOOGLE_KEY = 'google-sign-in'

export interface Kept {
  load(): Promise<string | null>
  save(kept: string | null): Promise<void>
}

export interface AppStore {
  store: Store
  sessions: Kept
  google: Kept
}

export function storeOver(places: readonly Place[]): AppStore {
  const store = createStore([...places])
  const each = places.map(place => createStore([place]))
  const kept = (key: string): Kept => ({
    load: () => store.get(key),
    save: async value => {
      if (value !== null) return store.set(key, value)
      const removals = await Promise.allSettled(each.map(one => one.remove(key)))
      for (const removal of removals) if (removal.status === 'rejected') throw removal.reason
    },
  })
  return { store, sessions: kept(SESSION_KEY), google: kept(GOOGLE_KEY) }
}

export const appStore = (bridge: EvenStorage): AppStore => storeOver([evenPlace(bridge), webPlace()])
