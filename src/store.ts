import { createStore, evenPlace, webPlace, type EvenStorage, type Store } from 'earshot'

export const appStore = (bridge: EvenStorage): Store => createStore([evenPlace(bridge), webPlace()])
