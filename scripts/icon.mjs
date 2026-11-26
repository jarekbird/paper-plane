import { mkdirSync, writeFileSync } from 'node:fs'
import { crc32, deflateSync, inflateSync } from 'node:zlib'

export const FILE = 'assets/icon.png'
export const SIZE = 24
export const GRID = [
  '...........#',
  '.........###',
  '.......###.#',
  '.....###..##',
  '...###...##.',
  '.###....###.',
  '####...###..',
  '...##.####..',
  '....#####...',
  '....####....',
  '....###.....',
  '....#.......',
]
const LIT = [0xf4, 0xf4, 0xf4, 0xff]
const DARK = [0, 0, 0, 0]
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export function pixels() {
  const scale = SIZE / GRID.length
  const rows = []
  for (let y = 0; y < SIZE; y++) {
    const row = [0]
    for (let x = 0; x < SIZE; x++) row.push(...(GRID[Math.floor(y / scale)][Math.floor(x / scale)] === '#' ? LIT : DARK))
    rows.push(Buffer.from(row))
  }
  return Buffer.concat(rows)
}

const chunk = (type, data) => {
  const body = Buffer.concat([Buffer.from(type), data])
  const length = Buffer.alloc(4)
  const sum = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  sum.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, sum])
}

export function png() {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(SIZE, 0)
  header.writeUInt32BE(SIZE, 4)
  header.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels(), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

export function read(file) {
  const chunks = {}
  for (let at = SIGNATURE.length; at < file.length;) {
    const length = file.readUInt32BE(at)
    chunks[file.toString('latin1', at + 4, at + 8)] = file.subarray(at + 8, at + 8 + length)
    at += 12 + length
  }
  return { width: chunks.IHDR.readUInt32BE(0), height: chunks.IHDR.readUInt32BE(4), pixels: inflateSync(chunks.IDAT) }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync('assets', { recursive: true })
  writeFileSync(FILE, png())
  console.log(`Wrote ${FILE}: ${SIZE}×${SIZE}, drawn on a ${GRID.length}×${GRID.length} grid.`)
}
