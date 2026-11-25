import { Glasses, type GlassesBridge, type GlassesOptions, type Lifetime } from 'earshot'

export interface Display {
  glasses: Glasses
  upToDate(): boolean
  onClear(told: () => void): () => void
  onUncover(told: () => void): () => void
}

export function display(life: Lifetime, bridge: GlassesBridge, options: Omit<GlassesOptions, 'watch'> = {}): Display {
  let asked = 0
  let drawn = 0
  let covered = false
  const listeners = new Set<() => void>()
  const uncovered = new Set<() => void>()
  const glasses = new Glasses(life, bridge, {
    ...options,
    watch: drawing => {
      if (drawing.at === 'ask') asked = drawing.frame
      if (drawing.at !== 'end' || !drawing.drawn) return
      drawn = Math.max(drawn, drawing.frame)
      if (drawn >= asked && !covered) for (const listener of [...listeners]) listener()
    },
  })
  const overlay = glasses.overlay.bind(glasses)
  glasses.overlay = text => {
    const was = covered
    covered = text !== null
    overlay(text)
    if (was && !covered) for (const listener of [...uncovered]) listener()
  }
  return {
    glasses,
    upToDate: () => drawn >= asked,
    onClear: told => {
      listeners.add(told)
      return () => void listeners.delete(told)
    },
    onUncover: told => {
      uncovered.add(told)
      return () => void uncovered.delete(told)
    },
  }
}
