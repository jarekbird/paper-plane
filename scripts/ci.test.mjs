import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..')
const workflow = readFileSync(path.join(root, '.github/workflows/check.yml'), 'utf8')
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const jobs = workflow
  .split(/^jobs:\n/m)[1]
  .split(/^ {2}(?=[\w-]+:\s*$)/m)
  .filter(Boolean)

describe('CI (docs/ci.md)', () => {
  it('runs on every push and every pull request, on any branch', () => {
    expect(workflow).toMatch(/^ {2}push:$/m)
    expect(workflow).toMatch(/^ {2}pull_request:$/m)
    expect(workflow).not.toMatch(/branches|paths/)
  })
  it('never skips a job, so a skipped run cannot pass for a tested one', () => {
    expect(workflow).not.toMatch(/^\s+if:/m)
  })
  it('runs npm run check, which holds every check the test map lists', () => {
    expect(workflow).toContain('      - run: npm ci\n      - run: npm run check\n')
    expect(pkg.scripts.check).toBe(
      [
        'prettier --check .',
        'eslint src',
        'node scripts/architecture.mjs',
        'tsc --noEmit',
        'vitest run',
        'vite build',
        'node scripts/store-check.mjs dist',
        'npm run build:telegram',
        'node scripts/store-check.mjs dist-telegram',
      ].join(' && '),
    )
  })
  it('gives every job a timeout, so a stalled run ends', () => {
    expect(jobs.length).toBeGreaterThan(0)
    for (const job of jobs) expect(job).toMatch(/^ {4}timeout-minutes: \d+$/m)
  })
  it('gives jobs a read-only token and no secret', () => {
    expect(workflow).toMatch(/\npermissions:\n {2}contents: read\n/)
    expect(workflow).not.toMatch(/write|secrets\./)
  })
})
