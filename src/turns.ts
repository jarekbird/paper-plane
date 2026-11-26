import type { Lifetime } from 'earshot'

export type InTurn = <T>(work: () => Promise<T>) => Promise<T>

export function turns(life: Lifetime): InTurn {
  let turn: Promise<void> = Promise.resolve()
  return async work => {
    const before = turn
    let free = () => {}
    turn = new Promise<void>(resolve => (free = resolve))
    try {
      await life.guard(before)
      return await life.guard(work())
    } finally {
      free()
    }
  }
}
