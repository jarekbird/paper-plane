#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ESLint } from 'eslint'
import tseslint from 'typescript-eslint'
import { isTest, moduleSource, repoPath, resolveImport, staticString } from '../eslint/plugin.js'

const ROOT = path.resolve(import.meta.dirname, '..')
export const DOC = 'docs/architecture.md'
export const MAP = 'docs/test-map.md'
export const START = '<!-- module-map:start -->'
export const END = '<!-- module-map:end -->'
const PACKAGES = ['@evenrealities/even_hub_sdk', 'earshot', '@mtcute']
const LINKS = [
  ['AGENTS.md', 'CLAUDE.md'],
  ['.agents/skills', '../.claude/skills'],
]

const read = (root, file) => readFileSync(path.join(root, file), 'utf8')

export const ruleIds = text => [...text.matchAll(/^- \*\*([A-Z]\d+)\*\*/gm)].map(m => m[1])
export const mapRows = text => [...text.matchAll(/^\| \*\*([A-Z]\d+)\*\* \|/gm)].map(m => m[1])
export const citedIds = architecture => Object.values(architecture).flatMap(([, entries]) => entries.flatMap(entry => entry.id.split(', ')))

export function violations(root, architecture) {
  const out = []
  const add = (file, message) => out.push(`G3 ${file}: ${message}`)
  for (const [link, target] of LINKS) {
    const full = path.join(root, link)
    const linked = lstatSync(full, { throwIfNoEntry: false })?.isSymbolicLink() && readlinkSync(full) === target
    if (!linked) add(link, `must be a symbolic link to ${target}`)
  }
  const rules = read(root, 'CLAUDE.md')
  const ids = ruleIds(rules)
  for (const [, skill] of rules.matchAll(/skill `([a-z-]+)`/g))
    if (!existsSync(path.join(root, '.claude/skills', skill, 'SKILL.md')))
      add('CLAUDE.md', `names skill ${skill}, which .claude/skills lacks`)
  const rows = mapRows(read(root, MAP))
  for (const id of ids) if (!rows.includes(id)) add(MAP, `has no row for rule ${id}: name its check, or say "no check yet"`)
  for (const id of rows) if (!ids.includes(id)) add(MAP, `has a row for ${id}, which is not a rule in CLAUDE.md`)
  for (const id of new Set(citedIds(architecture)))
    if (!ids.includes(id)) add('eslint.config.js', `cites ${id}, which is not a rule in CLAUDE.md`)
  return out
}

export function moduleOf(target) {
  const pack = PACKAGES.find(name => target === name || target.startsWith(`${name}/`))
  if (pack) return pack
  if (!target.startsWith('src/')) return null
  const parts = target.split('/')
  return parts.length > 2 ? `src/${parts[1]}` : target
}

const withExtension = target =>
  !target.startsWith('src/') || /\.[a-z]+$/.test(target) || existsSync(path.join(ROOT, target)) ? target : `${target}.ts`

export async function collectEdges(files = ['src']) {
  const edges = new Set()
  const imports = {
    create(context) {
      const file = repoPath(context.filename)
      const from = moduleOf(file)
      if (!from || isTest(file)) return {}
      const add = node => {
        const spec = staticString(moduleSource(node))
        if (spec === null) return
        const to = moduleOf(withExtension(resolveImport(file, spec)))
        if (to && to !== from) edges.add(JSON.stringify([from, to]))
      }
      return { ImportDeclaration: add, ExportNamedDeclaration: add, ExportAllDeclaration: add, ImportExpression: add, TSImportType: add }
    },
  }
  const eslint = new ESLint({
    cwd: ROOT,
    ignore: false,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}'],
        languageOptions: { parser: tseslint.parser, sourceType: 'module' },
        plugins: { map: { rules: { imports } } },
        rules: { 'map/imports': 'error' },
      },
    ],
  })
  await eslint.lintFiles(files)
  return [...edges].map(edge => JSON.parse(edge))
}

const nodeId = name => name.replace(/[^A-Za-z0-9]/g, '_')
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const boundary = rule =>
  `- **${rule.id}** ${rule.from.join(', ')}${rule.except ? ` (but not ${rule.except.join(', ')})` : ''} must not import ${
    rule.members ? `${rule.members.join(', ')} from ` : ''
  }${rule.to.join(', ')}.`

export function render(edges, architecture) {
  const sorted = [...edges].sort((a, b) => byText(a.join(' '), b.join(' ')))
  const nodes = [...new Set(sorted.flat())].sort(byText)
  return [
    '```mermaid',
    'flowchart LR',
    ...nodes.map(name => `  ${nodeId(name)}["${name}"]`),
    ...sorted.map(([from, to]) => `  ${nodeId(from)} --> ${nodeId(to)}`),
    '```',
    '',
    'Enforced by `eslint.config.js`:',
    '',
    ...architecture['plane/imports'][1].map(boundary),
  ].join('\n')
}

export function splice(doc, block) {
  const [head, rest] = doc.split(START)
  const tail = rest?.split(END)[1]
  if (tail === undefined) throw new Error(`${DOC} needs the markers ${START} and ${END}.`)
  return `${head}${START}\n${block}\n${END}${tail}`
}

export function difference(before, after) {
  const old = before.split('\n')
  const now = after.split('\n')
  return [
    ...old.filter(line => !now.includes(line)).map(line => `- ${line}`),
    ...now.filter(line => !old.includes(line)).map(line => `+ ${line}`),
  ]
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { architecture } = await import('../eslint.config.js')
  const found = violations(ROOT, architecture)
  const file = path.join(ROOT, DOC)
  const doc = readFileSync(file, 'utf8')
  const next = splice(doc, render(await collectEdges(), architecture))
  if (next !== doc && process.argv.includes('--write')) {
    writeFileSync(file, next)
    console.log(`Updated the module map in ${DOC}.`)
  } else if (next !== doc) {
    found.push(`${DOC}: the module map is stale. Regenerate it with npm run architecture.`, ...difference(doc, next))
  }
  for (const line of found) console.error(line)
  if (found.length) process.exit(1)
  console.log(
    `G3: the links, skills and rule IDs match CLAUDE.md, and every rule has a row in ${MAP}; the module map in ${DOC} is current.`,
  )
}
