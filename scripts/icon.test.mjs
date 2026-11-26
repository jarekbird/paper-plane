import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { FILE, GRID, pixels, read, SIZE } from './icon.mjs'

const root = path.resolve(import.meta.dirname, '..')

describe('the app icon (docs/ci.md, Shipping)', () => {
  it('is the 24×24 picture Even Hub asks for, which it reads two pixels by two', () => {
    const icon = read(readFileSync(path.join(root, FILE)))
    expect([icon.width, icon.height]).toEqual([SIZE, SIZE])
    expect(GRID.length * 2).toBe(SIZE)
    for (const row of GRID) expect(row).toMatch(/^[.#]{12}$/)
  })

  it('is the picture scripts/icon.mjs draws, so the file is never edited by hand', () => {
    expect(read(readFileSync(path.join(root, FILE))).pixels.equals(pixels())).toBe(true)
  })

  it('is one light colour on nothing, as the glasses have one colour', () => {
    const drawn = pixels()
    const colours = new Set()
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++)
        colours.add(drawn.subarray(y * (1 + SIZE * 4) + 1 + x * 4, y * (1 + SIZE * 4) + 5 + x * 4).toString('hex'))
    expect([...colours].sort()).toEqual(['00000000', 'f4f4f4ff'])
  })
})
