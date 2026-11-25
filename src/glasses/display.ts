import { Glasses, type GlassesBridge, type GlassesOptions, type Lifetime } from 'earshot'

export interface Display {
  glasses: Glasses
  upToDate(): boolean
}

export function display(life: Lifetime, bridge: GlassesBridge, options: Omit<GlassesOptions, 'watch'> = {}): Display {
  let asked = 0
  const glasses = new Glasses(life, bridge, {
    ...options,
    watch: drawing => {
      if (drawing.at === 'ask') asked = drawing.frame
    },
  })
  return { glasses, upToDate: () => glasses.shown >= asked }
}
