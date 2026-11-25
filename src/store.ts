import { createStore, evenPlace, webPlace, type EvenStorage, type Store } from 'earshot'

export const appStore = (bridge: EvenStorage): Store => createStore([evenPlace(bridge), webPlace()])

const SESSION_KEY = 'telegram-session'

export const sessionPlace = (store: Store) => ({
  load: () => store.get(SESSION_KEY),
  save: (session: string | null) => (session === null ? store.remove(SESSION_KEY) : store.set(SESSION_KEY, session)),
})
