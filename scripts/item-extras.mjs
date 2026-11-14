#!/usr/bin/env node
/**
 * CLI for the vault's item-extras sidecar (equipable / size).
 * Reads and writes go to the server. update.sh curls the file back into git.
 *
 *   pnpm run item-extras -- find "deerhunter"
 *   pnpm run item-extras -- show <catalogKey|substring>
 *   pnpm run item-extras -- set <key> --equipable true --size small,medium
 *   pnpm run item-extras -- set <key> --equipable false
 *   pnpm run item-extras -- clear-size <key>
 *   pnpm run item-extras -- delete <catalogKey|substring>
 *   pnpm run item-extras -- delete --key <catalogKey> [--key <catalogKey>...]
 *   pnpm run item-extras -- orphans
 *   pnpm run item-extras -- validate
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CATALOG_PATH = path.join(ROOT, 'public', 'catalog.json')
const DEFAULT_CATALOG_SERVER = 'http://vault-thirteen.net:49160'

// Keep in sync with PLAYER_SIZES, PLAYER_RACES, and PET_SIZES in src/catalog/itemExtras.ts.
const PLAYER_SIZES = ['small', 'medium', 'large']
const PLAYER_RACES = [
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
const PET_SIZES = ['ant', 'rat', 'dog', 'horse', 'giant', 'elephant', 'dinosaur']
const KNOWN_SIZE_TOKENS = new Set([...PLAYER_SIZES, ...PLAYER_RACES, ...PET_SIZES])

function usage(exitCode = 1) {
  console.log(`Usage:
  pnpm run item-extras -- find <substring>
  pnpm run item-extras -- show <catalogKey|substring>
  pnpm run item-extras -- set <catalogKey|substring> [--equipable true|false|null] [--size small,dwarf] [--note "..."]
  pnpm run item-extras -- clear-size <catalogKey|substring>
  pnpm run item-extras -- delete <catalogKey|substring> [--server URL] [--dry-run]
  pnpm run item-extras -- delete --key <catalogKey> [--key <catalogKey>...] [--server URL] [--dry-run]
  pnpm run item-extras -- orphans
  pnpm run item-extras -- validate

  --server URL overrides ${DEFAULT_CATALOG_SERVER} (or TFECAT_SERVER).
  --dry-run prints the POST and does not send it.`)
  process.exit(exitCode)
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

async function loadExtras(flags) {
  const url = `${catalogServer(flags)}/item-extras`
  let response
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  } catch (err) {
    console.error(`GET ${url} failed: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }
  if (!response.ok) {
    console.error(`GET ${url} failed: HTTP ${response.status}`)
    process.exit(1)
  }
  const data = await response.json()
  if (!data || typeof data !== 'object') return { version: 1, items: {} }
  if (!data.items || typeof data.items !== 'object') data.items = {}
  if (!data.version) data.version = 1
  return data
}

async function postJson(flags, path, body) {
  const url = `${catalogServer(flags)}${path}`
  console.log(`POST ${url}`)
  console.log(JSON.stringify(body, null, 2))
  if (flags['dry-run'] === true) {
    console.log('dry-run: not sent')
    return
  }
  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
  } catch (err) {
    console.error(`POST ${url} failed: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }
  const text = await response.text()
  if (!response.ok) {
    console.error(`POST ${url} failed: HTTP ${response.status}`)
    if (text) console.error(text)
    process.exit(1)
  }
  if (text.trim()) console.log(text.trim())
}

function loadCatalog() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`Missing ${CATALOG_PATH}`)
    process.exit(1)
  }
  return readJson(CATALOG_PATH)
}

const SIZE_RANK = Object.fromEntries(PLAYER_SIZES.map((size, index) => [size, index]))

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

async function cmdFind(query, flags) {
  const catalog = loadCatalog()
  const extras = await loadExtras(flags)
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

async function cmdShow(query, flags) {
  const catalog = loadCatalog()
  const extras = await loadExtras(flags)
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

const BOOLEAN_FLAGS = new Set(['dry-run'])

function parseArgs(argv) {
  const out = { positional: [], flags: {} }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      const value =
        BOOLEAN_FLAGS.has(key) || next == null || next.startsWith('--') ? true : next
      if (value !== true) i++
      if (Object.prototype.hasOwnProperty.call(out.flags, key)) {
        const prev = out.flags[key]
        out.flags[key] = Array.isArray(prev) ? [...prev, value] : [prev, value]
      } else {
        out.flags[key] = value
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

async function cmdSet(query, flags) {
  const catalog = loadCatalog()
  const entries = catalogEntries(catalog)
  const key = resolveOneKey(entries, query, 'set')

  const hasEquipable = Object.prototype.hasOwnProperty.call(flags, 'equipable')
  const hasSize = Object.prototype.hasOwnProperty.call(flags, 'size')
  const hasNote = Object.prototype.hasOwnProperty.call(flags, 'note')
  if (!hasEquipable && !hasSize && !hasNote) {
    console.error('set requires at least one of --equipable, --size, --note')
    process.exit(1)
  }

  const patch = {}
  if (hasEquipable) patch.equipable = parseEquipable(flags.equipable)
  if (hasSize) {
    const sizes = normalizeSizeTokens(flags.size === true ? '' : flags.size)
    for (const token of sizes) {
      if (!KNOWN_SIZE_TOKENS.has(token)) {
        console.warn(`warn: uncommon size token "${token}" (allowed; not in known set)`)
      }
    }
    // Empty size clears the restriction; everyone can use the item.
    patch.size = sizes.length ? sizes : null
  }
  if (hasNote) {
    const note = flags.note === true ? '' : String(flags.note)
    patch.note = note || null
  }
  await postJson(flags, '/item-extras/diff', { [key]: patch })
}

async function cmdClearSize(query, flags) {
  const catalog = loadCatalog()
  const entries = catalogEntries(catalog)
  const key = resolveOneKey(entries, query, 'clear-size')
  await postJson(flags, '/item-extras/diff', { [key]: { size: null } })
}

async function cmdOrphans(flags) {
  const catalog = loadCatalog()
  const extras = await loadExtras(flags)
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

async function cmdValidate(flags) {
  const catalog = loadCatalog()
  const extras = await loadExtras(flags)
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

function flagValues(flags, name) {
  if (!Object.prototype.hasOwnProperty.call(flags, name)) return []
  const value = flags[name]
  const values = Array.isArray(value) ? value : [value]
  if (values.some((v) => v === true)) {
    console.error(`--${name} requires a value`)
    process.exit(1)
  }
  return values.map((v) => String(v))
}

function catalogServer(flags) {
  const fromFlag = flagValues(flags, 'server')
  if (fromFlag.length > 1) {
    console.error('--server accepts one URL')
    process.exit(1)
  }
  const raw = fromFlag[0] || process.env.TFECAT_SERVER || DEFAULT_CATALOG_SERVER
  return String(raw).replace(/\/$/, '')
}

async function dropExtrasKeys(flags, keys) {
  if (!keys.length) return
  await postJson(flags, '/item-extras/delete', keys)
}

async function cmdDelete(query, flags) {
  const catalog = loadCatalog()
  const entries = catalogEntries(catalog)
  const keys = []
  for (const explicit of flagValues(flags, 'key')) {
    keys.push(resolveOneKey(entries, explicit, 'delete'))
  }
  if (query) keys.push(resolveOneKey(entries, query, 'delete'))
  const unique = [...new Set(keys)]
  if (!unique.length) usage()

  const url = `${catalogServer(flags)}/catalog/deleteItems`
  console.log(`POST ${url}`)
  for (const key of unique) console.log(`  ${key}`)
  if (flags['dry-run'] === true) {
    console.log('dry-run: not sent')
    return
  }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(unique),
      signal: AbortSignal.timeout(15000),
    })
  } catch (err) {
    console.error(`delete failed: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }
  const text = await response.text()
  if (!response.ok) {
    console.error(`delete failed: HTTP ${response.status}`)
    if (text) console.error(text)
    process.exit(1)
  }
  console.log(text.trim() || `deleted ${unique.length} item(s)`)
  const missing = new Set(
    text.split('\n').flatMap((line) => {
      const match = line.match(/^not found: (.*)$/)
      return match ? [match[1]] : []
    }),
  )
  await dropExtrasKeys(flags, unique.filter((key) => !missing.has(key)))
  if (missing.size) process.exit(1)
}

// pnpm may forward a literal "--" before the subcommand (`pnpm run item-extras -- find`).
const argv = process.argv.slice(2).filter((a, i, arr) => !(a === '--' && (i === 0 || arr[i - 1] === '--')))
if (!argv.length || argv[0] === '-h' || argv[0] === '--help') usage(0)

const cmd = argv[0]
const rest = argv.slice(1)

const run = async () => {
  switch (cmd) {
    case 'find': {
      const { positional, flags } = parseArgs(rest)
      if (!positional[0]) usage()
      await cmdFind(positional.join(' '), flags)
      break
    }
    case 'show': {
      const { positional, flags } = parseArgs(rest)
      if (!positional[0]) usage()
      await cmdShow(positional.join(' '), flags)
      break
    }
    case 'set': {
      const { positional, flags } = parseArgs(rest)
      if (!positional[0]) usage()
      await cmdSet(positional.join(' '), flags)
      break
    }
    case 'clear-size': {
      const { positional, flags } = parseArgs(rest)
      if (!positional[0]) usage()
      await cmdClearSize(positional.join(' '), flags)
      break
    }
    case 'delete': {
      const { positional, flags } = parseArgs(rest)
      await cmdDelete(positional.join(' '), flags)
      break
    }
    case 'orphans':
      await cmdOrphans(parseArgs(rest).flags)
      break
    case 'validate':
      await cmdValidate(parseArgs(rest).flags)
      break
    default:
      console.error(`Unknown command: ${cmd}`)
      usage()
  }
}

run().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
