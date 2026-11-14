#!/usr/bin/env node
/**
 * Local CLI for public/item-extras.json (sidecar equipable / size).
 *
 *   pnpm run item-extras -- find "deerhunter"
 *   pnpm run item-extras -- show <catalogKey|substring>
 *   pnpm run item-extras -- set <key> --equipable true --size gnome,human
 *   pnpm run item-extras -- set <key> --equipable false
 *   pnpm run item-extras -- clear-size <key>
 *   pnpm run item-extras -- orphans
 *   pnpm run item-extras -- validate
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CATALOG_PATH = path.join(ROOT, 'public', 'catalog.json')
const EXTRAS_PATH = path.join(ROOT, 'public', 'item-extras.json')

// Keep in sync with GAME_SIZES and PLAYER_RACES in src/catalog/itemExtras.ts.
const GAME_SIZES = [
  'ant',
  'rat',
  'dog',
  'gnome',
  'human',
  'ogre',
  'horse',
  'giant',
  'elephant',
  'dinosaur',
]
const PLAYER_RACES = [
  'centaur',
  'dwarf',
  'elf',
  'ent',
  'gnome',
  'goblin',
  'halfling',
  'human',
  'lizardfolk',
  'ogre',
  'orc',
  'troll',
  'vyan',
]
const KNOWN_SIZE_TOKENS = new Set([...GAME_SIZES, ...PLAYER_RACES])

function usage(exitCode = 1) {
  console.log(`Usage:
  pnpm run item-extras -- find <substring>
  pnpm run item-extras -- show <catalogKey|substring>
  pnpm run item-extras -- set <catalogKey|substring> [--equipable true|false|null] [--size gnome,dwarf] [--note "..."]
  pnpm run item-extras -- clear-size <catalogKey|substring>
  pnpm run item-extras -- orphans
  pnpm run item-extras -- validate`)
  process.exit(exitCode)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function emptyExtras() {
  return { version: 1, updatedAt: new Date().toISOString(), items: {} }
}

function loadExtras() {
  if (!fs.existsSync(EXTRAS_PATH)) return emptyExtras()
  const data = readJson(EXTRAS_PATH)
  if (!data || typeof data !== 'object') return emptyExtras()
  if (!data.items || typeof data.items !== 'object') data.items = {}
  if (!data.version) data.version = 1
  return data
}

function loadCatalog() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`Missing ${CATALOG_PATH}`)
    process.exit(1)
  }
  return readJson(CATALOG_PATH)
}

const SIZE_RANK = Object.fromEntries(GAME_SIZES.map((size, index) => [size, index]))

function normalizeSizeTokens(input) {
  if (input == null) return []
  const parts = Array.isArray(input) ? input : String(input).split(',')
  const out = new Set()
  for (const part of parts) {
    const t = part.trim().toLowerCase()
    if (t) out.add(t)
  }
  return [...out].sort((a, b) => {
    const ra = SIZE_RANK[a] ?? 100
    const rb = SIZE_RANK[b] ?? 100
    if (ra !== rb) return ra - rb
    return a.localeCompare(b)
  })
}

function sortObjectKeys(obj) {
  const sorted = {}
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = obj[key]
  }
  return sorted
}

function writeExtras(extras) {
  extras.version = extras.version || 1
  extras.updatedAt = new Date().toISOString()
  extras.items = sortObjectKeys(extras.items)
  const text = `${JSON.stringify(extras, null, 2)}\n`
  fs.writeFileSync(EXTRAS_PATH, text, 'utf8')
  console.log(`Wrote ${EXTRAS_PATH}`)
}

function stripArticle(name) {
  return String(name ?? '').replace(/^(A set of|A pair of|A|An|The|Some) /i, '')
}

function catalogEntries(catalog) {
  return Object.keys(catalog).map((key) => {
    const item = catalog[key]
    return {
      catalogKey: key,
      name: stripArticle(item?.name),
      unidentified: stripArticle(item?.['Unidentified Name']),
      level: item?.Level ?? item?.level,
      itemType: item?.itemType,
    }
  })
}

function matchEntries(entries, query) {
  const q = String(query ?? '')
    .trim()
    .toLowerCase()
  if (!q) return []
  const exact = entries.filter((e) => e.catalogKey.toLowerCase() === q)
  if (exact.length) return exact
  return entries.filter(
    (e) =>
      e.catalogKey.toLowerCase().includes(q) ||
      e.name.toLowerCase().includes(q) ||
      e.unidentified.toLowerCase().includes(q),
  )
}

function resolveOneKey(entries, query, label) {
  const hits = matchEntries(entries, query)
  if (!hits.length) {
    console.error(`No catalog match for ${label}: ${query}`)
    process.exit(1)
  }
  if (hits.length > 1) {
    console.error(`Ambiguous ${label} (${hits.length} matches). Narrow the query:`)
    for (const h of hits.slice(0, 20)) {
      console.error(`  ${h.catalogKey}`)
    }
    if (hits.length > 20) console.error(`  … +${hits.length - 20} more`)
    process.exit(1)
  }
  return hits[0].catalogKey
}

function formatExtra(extra) {
  if (!extra) return '(none)'
  const bits = []
  if (extra.equipable !== undefined && extra.equipable !== null) {
    bits.push(`equipable=${extra.equipable}`)
  } else {
    bits.push('equipable=?')
  }
  if (extra.size !== undefined && extra.size !== null) {
    bits.push(`size=[${extra.size.join(',')}]`)
  } else {
    bits.push('size=?')
  }
  if (extra.note) bits.push(`note=${JSON.stringify(extra.note)}`)
  if (extra.updatedAt) bits.push(`updatedAt=${extra.updatedAt}`)
  return bits.join(' ')
}

function cmdFind(query) {
  const catalog = loadCatalog()
  const extras = loadExtras()
  const entries = catalogEntries(catalog)
  const hits = matchEntries(entries, query)
  if (!hits.length) {
    console.log('No matches.')
    return
  }
  for (const h of hits.slice(0, 50)) {
    const extra = extras.items[h.catalogKey]
    console.log(
      `${h.catalogKey}\n  name=${h.name}  type=${h.itemType ?? '?'}  lvl=${h.level ?? '?'}\n  extras: ${formatExtra(extra)}`,
    )
  }
  if (hits.length > 50) console.log(`… +${hits.length - 50} more`)
  console.log(`${hits.length} match(es)`)
}

function cmdShow(query) {
  const catalog = loadCatalog()
  const extras = loadExtras()
  const entries = catalogEntries(catalog)
  const key = resolveOneKey(entries, query, 'show')
  const entry = entries.find((e) => e.catalogKey === key)
  console.log(`catalogKey: ${key}`)
  console.log(`name: ${entry?.name}`)
  console.log(`unidentified: ${entry?.unidentified}`)
  console.log(`level: ${entry?.level}`)
  console.log(`type: ${entry?.itemType}`)
  console.log(`extras: ${formatExtra(extras.items[key])}`)
  if (extras.items[key]) {
    console.log(JSON.stringify(extras.items[key], null, 2))
  }
}

function parseArgs(argv) {
  const out = { positional: [], flags: {} }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next == null || next.startsWith('--')) {
        out.flags[key] = true
      } else {
        out.flags[key] = next
        i++
      }
    } else {
      out.positional.push(a)
    }
  }
  return out
}

function parseEquipable(raw) {
  if (raw === undefined) return undefined
  if (raw === true) return true
  const s = String(raw).trim().toLowerCase()
  if (s === 'true' || s === '1' || s === 'yes') return true
  if (s === 'false' || s === '0' || s === 'no') return false
  if (s === 'null' || s === 'clear' || s === 'unknown' || s === '') return null
  console.error(`Invalid --equipable value: ${raw} (use true|false|null)`)
  process.exit(1)
}

function cmdSet(query, flags) {
  const catalog = loadCatalog()
  const extras = loadExtras()
  const entries = catalogEntries(catalog)
  const key = resolveOneKey(entries, query, 'set')

  const hasEquipable = Object.prototype.hasOwnProperty.call(flags, 'equipable')
  const hasSize = Object.prototype.hasOwnProperty.call(flags, 'size')
  const hasNote = Object.prototype.hasOwnProperty.call(flags, 'note')
  if (!hasEquipable && !hasSize && !hasNote) {
    console.error('set requires at least one of --equipable, --size, --note')
    process.exit(1)
  }

  const row = { ...(extras.items[key] || {}) }
  if (hasEquipable) {
    const v = parseEquipable(flags.equipable)
    if (v === null) delete row.equipable
    else row.equipable = v
  }
  if (hasSize) {
    // Explicit empty --size '' → size: [] (blocked by size).
    const sizes = normalizeSizeTokens(flags.size === true ? '' : flags.size)
    row.size = sizes
  }
  if (hasNote) {
    const note = flags.note === true ? '' : String(flags.note)
    if (!note) delete row.note
    else row.note = note
  }
  row.updatedAt = new Date().toISOString()
  const keepEquipable = row.equipable !== undefined && row.equipable !== null
  const keepSize = row.size !== undefined
  const keepNote = !!(row.note && String(row.note).length)
  if (!keepEquipable && !keepSize && !keepNote) {
    delete extras.items[key]
    writeExtras(extras)
    console.log(`${key}: removed empty extras row`)
    return
  }
  extras.items[key] = row
  writeExtras(extras)
  console.log(`${key}: ${formatExtra(row)}`)
}

function cmdClearSize(query) {
  const catalog = loadCatalog()
  const extras = loadExtras()
  const entries = catalogEntries(catalog)
  const key = resolveOneKey(entries, query, 'clear-size')
  const row = extras.items[key]
  if (!row) {
    console.log(`${key}: no extras row`)
    return
  }
  if (row.size === undefined) {
    console.log(`${key}: size already omitted`)
    return
  }
  delete row.size
  row.updatedAt = new Date().toISOString()
  // Drop empty rows (no equipable/size/note)
  if (
    (row.equipable === undefined || row.equipable === null) &&
    (row.note === undefined || row.note === null || row.note === '')
  ) {
    delete extras.items[key]
    writeExtras(extras)
    console.log(`${key}: cleared size; removed empty extras row`)
    return
  }
  extras.items[key] = row
  writeExtras(extras)
  console.log(`${key}: ${formatExtra(row)}`)
}

function cmdOrphans() {
  const catalog = loadCatalog()
  const extras = loadExtras()
  const catalogKeys = new Set(Object.keys(catalog))
  const orphans = Object.keys(extras.items).filter((k) => !catalogKeys.has(k))
  if (!orphans.length) {
    console.log('No orphan extras keys.')
    return
  }
  console.log(`${orphans.length} orphan(s):`)
  for (const k of orphans.sort((a, b) => a.localeCompare(b))) {
    console.log(`  ${k}  ${formatExtra(extras.items[k])}`)
  }
}

function cmdValidate() {
  const catalog = loadCatalog()
  const extras = loadExtras()
  const catalogKeys = new Set(Object.keys(catalog))
  let errors = 0
  let warnings = 0

  if (extras.version !== 1 && extras.version !== undefined) {
    console.warn(`warn: unexpected version ${extras.version}`)
    warnings++
  }
  if (!extras.items || typeof extras.items !== 'object' || Array.isArray(extras.items)) {
    console.error('error: items must be an object map')
    process.exit(1)
  }

  for (const [key, row] of Object.entries(extras.items)) {
    if (!catalogKeys.has(key)) {
      console.warn(`warn: orphan key (not in catalog): ${key}`)
      warnings++
    }
    if (row == null || typeof row !== 'object' || Array.isArray(row)) {
      console.error(`error: ${key}: row must be an object`)
      errors++
      continue
    }
    if (
      row.equipable !== undefined &&
      row.equipable !== null &&
      typeof row.equipable !== 'boolean'
    ) {
      console.error(`error: ${key}: equipable must be boolean|null`)
      errors++
    }
    if (row.size !== undefined && row.size !== null) {
      if (!Array.isArray(row.size)) {
        console.error(`error: ${key}: size must be a string array`)
        errors++
      } else {
        for (const tok of row.size) {
          if (typeof tok !== 'string' || !tok.trim()) {
            console.error(`error: ${key}: invalid size token ${JSON.stringify(tok)}`)
            errors++
          } else if (!KNOWN_SIZE_TOKENS.has(tok.toLowerCase())) {
            console.warn(
              `warn: ${key}: uncommon size token "${tok}" (allowed; not in known set)`,
            )
            warnings++
          }
        }
      }
    }
    if (row.note !== undefined && row.note !== null && typeof row.note !== 'string') {
      console.error(`error: ${key}: note must be a string`)
      errors++
    }
  }

  console.log(
    `validate: ${Object.keys(extras.items).length} extras row(s); ${errors} error(s); ${warnings} warning(s)`,
  )
  if (errors) process.exit(1)
}

// pnpm may forward a literal "--" before the subcommand (`pnpm run item-extras -- find`).
const argv = process.argv.slice(2).filter((a, i, arr) => !(a === '--' && (i === 0 || arr[i - 1] === '--')))
if (!argv.length || argv[0] === '-h' || argv[0] === '--help') usage(0)

const cmd = argv[0]
const rest = argv.slice(1)

switch (cmd) {
  case 'find': {
    if (!rest[0]) usage()
    cmdFind(rest.join(' '))
    break
  }
  case 'show': {
    if (!rest[0]) usage()
    cmdShow(rest.join(' '))
    break
  }
  case 'set': {
    const { positional, flags } = parseArgs(rest)
    if (!positional[0]) usage()
    cmdSet(positional.join(' '), flags)
    break
  }
  case 'clear-size': {
    if (!rest[0]) usage()
    cmdClearSize(rest.join(' '))
    break
  }
  case 'orphans':
    cmdOrphans()
    break
  case 'validate':
    cmdValidate()
    break
  default:
    console.error(`Unknown command: ${cmd}`)
    usage()
}
