import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const fixtures = path.join(root, 'eslint', 'fixtures')

export const repoPath = file =>
  path
    .relative(file.startsWith(fixtures + path.sep) ? fixtures : root, file)
    .split(path.sep)
    .join('/')
export const under = (file, prefix) => file === prefix || file.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`)
export const isTest = file => /\.test\.[cm]?[jt]sx?$/.test(file)
const applies = (entry, file) =>
  (entry.tests || !isTest(file)) && entry.from.some(p => under(file, p)) && !(entry.except ?? []).some(p => under(file, p))
const entriesFor = context => (context.options[0] ?? []).filter(entry => applies(entry, repoPath(context.filename)))
const schema = [{ type: 'array', items: { type: 'object' } }]

export function staticString(node) {
  if (!node) return null
  if (node.type === 'Literal') return typeof node.value === 'string' ? node.value : null
  if (node.type === 'TemplateLiteral') {
    const parts = node.expressions.map(staticString)
    if (parts.some(p => p === null)) return null
    return node.quasis.map((q, i) => q.value.cooked + (parts[i] ?? '')).join('')
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const left = staticString(node.left)
    const right = staticString(node.right)
    return left === null || right === null ? null : left + right
  }
  if (node.type === 'TSAsExpression' || node.type === 'TSNonNullExpression' || node.type === 'TSSatisfiesExpression')
    return staticString(node.expression)
  return null
}

const WRAPPERS = ['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression']

const partOfLargerString = node => {
  const parent = node.parent
  if (!parent) return false
  if (parent.type === 'TemplateLiteral' || WRAPPERS.includes(parent.type)) return true
  return parent.type === 'BinaryExpression' && parent.operator === '+' && staticString(parent) !== null
}

export const resolveImport = (file, spec) =>
  spec.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), spec)) : spec

export const moduleSource = node => {
  switch (node.type) {
    case 'ImportDeclaration':
    case 'ExportAllDeclaration':
    case 'ExportNamedDeclaration':
    case 'ImportExpression':
      return node.source
    case 'TSImportType':
      return node.source ?? (node.argument?.type === 'TSLiteralType' ? node.argument.literal : node.argument)
    case 'TSExternalModuleReference':
      return node.expression
    case 'CallExpression':
      return node.callee.type === 'Identifier' && node.callee.name === 'require' ? (node.arguments[0] ?? node) : undefined
    default:
      return undefined
  }
}

const nameOf = node => (node.type === 'Identifier' ? node.name : String(node.value))

const takenNames = node => {
  switch (node.type) {
    case 'ImportDeclaration':
      if (node.specifiers.some(s => s.type === 'ImportNamespaceSpecifier')) return null
      return node.specifiers.map(s => (s.type === 'ImportSpecifier' ? nameOf(s.imported) : 'default'))
    case 'ExportNamedDeclaration':
      return node.specifiers.map(s => nameOf(s.local))
    case 'TSImportType': {
      let left = node.qualifier
      while (left?.type === 'TSQualifiedName') left = left.left
      return left ? [left.name] : null
    }
    default:
      return null
  }
}

const imports = {
  meta: {
    type: 'problem',
    schema,
    messages: {
      denied: '{{id}}: {{file}} must not import {{spec}}. {{advice}}',
      member: '{{id}}: {{file}} must not import {{name}} from {{spec}}. {{advice}}',
      hidden: '{{id}}: {{file}} takes {{spec}} whole, so the checks cannot see which names it uses. Import each by name. {{advice}}',
      computed: '{{id}}: a module name the checks cannot read. Import a literal path.',
    },
  },
  create(context) {
    const file = repoPath(context.filename)
    const entries = entriesFor(context)
    if (!entries.length) return {}
    const check = node => {
      const source = moduleSource(node)
      if (source === undefined || source === null) return
      const spec = staticString(source)
      if (spec === null) {
        for (const entry of entries) context.report({ node, messageId: 'computed', data: { id: entry.id } })
        return
      }
      const target = resolveImport(file, spec)
      for (const entry of entries) {
        if (!entry.to.some(p => under(target, p))) continue
        const data = { id: entry.id, file, spec, advice: entry.advice }
        if (!entry.members) {
          context.report({ node, messageId: 'denied', data })
          continue
        }
        const taken = takenNames(node)
        if (taken === null) context.report({ node, messageId: 'hidden', data })
        else
          for (const name of taken) if (entry.members.includes(name)) context.report({ node, messageId: 'member', data: { ...data, name } })
      }
    }
    return {
      ImportDeclaration: check,
      ExportAllDeclaration: check,
      ExportNamedDeclaration: check,
      ImportExpression: check,
      TSImportType: check,
      TSExternalModuleReference: check,
      CallExpression: check,
    }
  },
}

const stringNodes = visit => ({
  Literal: visit,
  TemplateLiteral: visit,
  'BinaryExpression[operator="+"]': visit,
  TSAsExpression: visit,
  TSSatisfiesExpression: visit,
  TSNonNullExpression: visit,
})

const names = {
  meta: {
    type: 'problem',
    schema,
    messages: { named: '{{id}}: {{file}} names {{name}}. {{advice}}' },
  },
  create(context) {
    const file = repoPath(context.filename)
    const entries = entriesFor(context).map(entry => ({ ...entry, set: new Set(entry.names) }))
    if (!entries.length) return {}
    const report = (node, name) => {
      for (const entry of entries) {
        if (entry.set.has(name)) context.report({ node, messageId: 'named', data: { id: entry.id, file, name, advice: entry.advice } })
      }
    }
    return {
      Identifier: node => report(node, node.name),
      ...stringNodes(node => {
        if (partOfLargerString(node)) return
        const value = staticString(node)
        if (value !== null) report(node, value)
      }),
    }
  },
}

const GLOBAL_OBJECTS = new Set(['globalThis', 'window', 'self', 'global', 'frames', 'top', 'parent'])
const OPAQUE = new Set(['eval', 'Function', 'Reflect'])

const opaque = {
  meta: {
    type: 'problem',
    schema,
    messages: {
      global: '{{id}}: {{name}} is used other than to read one named property, so the checks cannot see what it reaches.',
      dynamic: '{{id}}: {{name}} runs or reaches code by a computed name the checks cannot read.',
    },
  },
  create(context) {
    const entries = entriesFor(context)
    if (!entries.length) return {}
    const id = entries.map(e => e.id).join(', ')
    const typePosition = node => node.parent?.type?.startsWith('TS') && !WRAPPERS.includes(node.parent.type)
    const listenedTo = node => {
      const call = node.parent
      const callee = call.type === 'CallExpression' && call.arguments[0] === node ? call.callee : null
      return callee?.type === 'MemberExpression' && !callee.computed && callee.property.name === 'listen'
    }
    return {
      'Program:exit'() {
        const scope = context.sourceCode.scopeManager.globalScope
        const refs = new Set(scope.through)
        for (const name of [...GLOBAL_OBJECTS, ...OPAQUE]) for (const ref of scope.set.get(name)?.references ?? []) refs.add(ref)
        for (const ref of refs) {
          const node = ref.identifier
          if (typePosition(node)) continue
          const parent = node.parent
          if (OPAQUE.has(node.name)) context.report({ node, messageId: 'dynamic', data: { id, name: node.name } })
          else if (GLOBAL_OBJECTS.has(node.name)) {
            const read =
              parent.type === 'MemberExpression' && parent.object === node && (!parent.computed || staticString(parent.property) !== null)
            if (!read && !listenedTo(node)) context.report({ node, messageId: 'global', data: { id, name: node.name } })
          }
        }
      },
    }
  },
}

const isFunction = node => ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)

const functionOf = node => {
  for (let at = node.parent; at; at = at.parent) if (isFunction(at)) return at
  return null
}

const unwrapped = node => {
  let at = node
  while (at.parent.type === 'ChainExpression' || WRAPPERS.includes(at.parent.type)) at = at.parent
  return at
}

const lifetime = {
  meta: {
    type: 'problem',
    schema,
    messages: {
      owned: '{{id}}: {{name}} must be opened inside life.own(...), so it ends with its screen or session.',
      dropped: '{{id}}: the handle from {{name}}() is dropped, so nothing can end it. Pass it to life.own(...).',
    },
  },
  create(context) {
    const entries = entriesFor(context)
    if (!entries.length) return {}
    const id = entries.map(e => e.id).join(', ')
    const sockets = new Set(entries.flatMap(e => e.sockets ?? []))
    const handles = new Set(entries.flatMap(e => e.handles ?? []))
    const insideOwn = node => {
      for (let child = node, at = node.parent; at; child = at, at = at.parent) {
        if (isFunction(at)) return false
        const callee = at.type === 'CallExpression' ? at.callee : null
        const own =
          callee &&
          at.arguments.includes(child) &&
          ((callee.type === 'MemberExpression' && !callee.computed && callee.property.name === 'own') ||
            (callee.type === 'Identifier' && callee.name === 'own'))
        if (own) return true
        if (at.type.endsWith('Statement') || at.type === 'VariableDeclaration') return false
      }
      return false
    }
    const typeOnly = node =>
      ['TSTypeReference', 'TSQualifiedName', 'TSTypeQuery', 'TSInterfaceHeritage', 'TSClassImplements'].includes(node.parent.type)
    const check = (node, name) => {
      if (!sockets.has(name)) return
      if (node.type === 'Identifier' && typeOnly(node)) return
      const parent = node.parent
      const member = parent.type === 'MemberExpression' && parent.property === node
      const use = unwrapped(member ? parent : node)
      const opened = use.parent.type === 'NewExpression' && use.parent.callee === use && insideOwn(use.parent)
      if (!opened) context.report({ node, messageId: 'owned', data: { id, name } })
    }
    return {
      Identifier: node => check(node, node.name),
      ...stringNodes(node => {
        if (partOfLargerString(node) || node.parent.type === 'TSLiteralType') return
        const name = staticString(node)
        if (name !== null) check(node, name)
      }),
      CallExpression(node) {
        let callee = node.callee
        while (WRAPPERS.includes(callee.type)) callee = callee.expression
        const name =
          callee.type === 'Identifier'
            ? callee.name
            : callee.type === 'MemberExpression'
              ? callee.computed
                ? staticString(callee.property)
                : callee.property.name
              : null
        if (!handles.has(name)) return
        const parent = unwrapped(node).parent
        if (parent.type === 'ExpressionStatement' || (parent.type === 'UnaryExpression' && parent.operator === 'void'))
          context.report({ node, messageId: 'dropped', data: { id, name } })
      },
    }
  },
}

const awaits = {
  meta: {
    type: 'problem',
    schema,
    messages: {
      bare: '{{id}}: this function owns a Lifetime, so every await goes through life.guard(...); after it the target is still current or LifetimeEnded is thrown.',
      rebound:
        '{{id}}: {{name}} is read after an await, so it may be a newer lifetime than the one the user acted under. Bind it before the first await (const life = {{name}}) and guard with that.',
      then: '{{id}}: .then() in a function that owns a Lifetime skips its recheck. await life.guard(...) instead.',
      untyped: '{{id}}: this check reads types. Lint this file with parserOptions.projectService.',
    },
  },
  create(context) {
    const entries = entriesFor(context)
    if (!entries.length) return {}
    const id = entries.map(e => e.id).join(', ')
    const services = context.sourceCode.parserServices
    if (!services?.program) return { Program: node => context.report({ node, messageId: 'untyped', data: { id } }) }
    const named = type => type.getSymbol?.()?.getName() === 'Lifetime' || Boolean(type.isUnion?.() && type.types.some(named))
    const isLifetime = node => named(services.getTypeAtLocation(node))
    const fns = new Map()
    const entry = fn => {
      if (!fns.has(fn)) fns.set(fn, { owns: false, awaits: [], lifeReads: [], thens: [] })
      return fns.get(fn)
    }
    const awaited = node => {
      const fn = functionOf(node)
      if (fn?.async) entry(fn).awaits.push(node)
    }
    return {
      AwaitExpression: awaited,
      'ForOfStatement[await=true]': awaited,
      'Identifier, MemberExpression'(node) {
        const parent = node.parent
        if (node.type === 'Identifier') {
          if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return
          if (parent.type === 'Property' && parent.key === node && !parent.shorthand) return
          if (parent.type.startsWith('TS')) return
        }
        if (!isLifetime(node)) return
        for (let at = functionOf(node); at; at = functionOf(at)) entry(at).owns = true
        const fn = functionOf(node)
        if (node.type === 'MemberExpression' && fn?.async) entry(fn).lifeReads.push(node)
      },
      'CallExpression[callee.property.name="then"]'(node) {
        const fn = functionOf(node)
        if (fn) entry(fn).thens.push(node)
      },
      'Program:exit'() {
        for (const info of fns.values()) {
          if (!info.owns) continue
          for (const node of info.thens) context.report({ node, messageId: 'then', data: { id } })
          for (const node of info.awaits) {
            const arg = node.argument
            const safe =
              node.type === 'AwaitExpression' &&
              arg?.type === 'CallExpression' &&
              arg.callee.type === 'MemberExpression' &&
              arg.callee.property.type === 'Identifier' &&
              arg.callee.property.name === 'guard' &&
              isLifetime(arg.callee.object)
            if (!safe) context.report({ node, messageId: 'bare', data: { id } })
          }
          if (!info.awaits.length) continue
          const first = Math.min(...info.awaits.map(a => a.range[1]))
          for (const node of info.lifeReads) {
            if (node.range[0] < first) continue
            context.report({ node, messageId: 'rebound', data: { id, name: context.sourceCode.getText(node) } })
          }
        }
      },
    }
  },
}

export default { rules: { imports, names, opaque, lifetime, awaits } }
