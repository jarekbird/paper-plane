import { createStore, evenPlace, webPlace, type EvenStorage, type Place, type Store } from 'earshot'

const SESSION_KEY = 'telegram-session'

export interface AppStore {
  store: Store
  sessions: {
    load(): Promise<string | null>
    save(session: string | null): Promise<void>
  }
}

export function storeOver(places: readonly Place[]): AppStore {
  const store = createStore([...places])
  const each = places.map(place => createStore([place]))
  return {
    store,
    sessions: {
      load: () => store.get(SESSION_KEY),
      save: async session => {
        if (session !== null) return store.set(SESSION_KEY, session)
        const removals = await Promise.allSettled(each.map(one => one.remove(SESSION_KEY)))
        for (const removal of removals) if (removal.status === 'rejected') throw removal.reason
      },
    },
  }
}

export const appStore = (bridge: EvenStorage): AppStore => storeOver([evenPlace(bridge), webPlace()])
