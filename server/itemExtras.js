/**
 * In-memory item-extras document. The vault holds it; update.sh curls it back
 * into public/item-extras.json. Keep the size order in sync with
 * PLAYER_SIZES in src/catalog/itemExtras.ts.
 */

const PLAYER_SIZES = ['small', 'medium', 'large']
const SIZE_RANK = Object.fromEntries(PLAYER_SIZES.map((size, index) => [size, index]))
const ROW_FIELDS = new Set(['equipable', 'size', 'note'])

export function emptyItemExtras() {
  return { version: 1, updatedAt: new Date(0).toISOString(), items: {} }
}

function sortKeys(obj) {
  const sorted = {}
  for (const key of Object.keys(obj).sort((a, b) => a.localeCompare(b))) {
    sorted[key] = obj[key]
  }
  return sorted
}

function sortSizes(sizes) {
  return [...sizes].sort((a, b) => {
    const ra = SIZE_RANK[a] ?? 100
    const rb = SIZE_RANK[b] ?? 100
    if (ra !== rb) return ra - rb
    return a.localeCompare(b)
  })
}

export function normalizeItemExtras(data) {
  const extras = emptyItemExtras()
  if (!data || typeof data !== 'object' || Array.isArray(data)) return extras
  if (typeof data.version === 'number') extras.version = data.version
  if (typeof data.updatedAt === 'string') extras.updatedAt = data.updatedAt
  if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
    extras.items = sortKeys(data.items)
  }
  return extras
}

function rowIsEmpty(row) {
  const hasEquipable = row.equipable === true || row.equipable === false
  const hasSize = Array.isArray(row.size) && row.size.length > 0
  const hasNote = typeof row.note === 'string' && row.note.length > 0
  return !hasEquipable && !hasSize && !hasNote
}

/**
 * Merge a `{ catalogKey: { equipable, size, note } }` patch into extras.
 * null, or an empty size, clears that field. A row with nothing left is removed.
 * A null row removes the key.
 */
export function applyItemExtrasDiff(extras, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, message: 'body must be an object map of catalog key to fields' }
  }

  const lines = []
  for (const key of Object.keys(body)) {
    const patch = body[key]
    if (patch === null) {
      delete extras.items[key]
      lines.push(`${key}: removed`)
      continue
    }
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return { ok: false, status: 400, message: `${key}: row must be an object or null` }
    }
    for (const field of Object.keys(patch)) {
      if (!ROW_FIELDS.has(field)) {
        return { ok: false, status: 400, message: `${key}: unknown field ${field}` }
      }
    }

    const row = { ...(extras.items[key] || {}) }
    if (Object.prototype.hasOwnProperty.call(patch, 'equipable')) {
      const value = patch.equipable
      if (value === null) delete row.equipable
      else if (typeof value === 'boolean') row.equipable = value
      else return { ok: false, status: 400, message: `${key}: equipable must be boolean or null` }
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'size')) {
      const value = patch.size
      if (value === null || (Array.isArray(value) && value.length === 0)) {
        delete row.size
      } else if (
        Array.isArray(value) &&
        value.every((token) => typeof token === 'string' && token.trim())
      ) {
        row.size = sortSizes([...new Set(value.map((token) => token.trim().toLowerCase()))])
      } else {
        return { ok: false, status: 400, message: `${key}: size must be a string array or null` }
      }
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'note')) {
      const value = patch.note
      if (value === null || value === '') delete row.note
      else if (typeof value === 'string') row.note = value
      else return { ok: false, status: 400, message: `${key}: note must be a string or null` }
    }

    if (rowIsEmpty(row)) {
      delete extras.items[key]
      lines.push(`${key}: removed`)
      continue
    }
    row.updatedAt = new Date().toISOString()
    extras.items[key] = row
    lines.push(`${key}: updated`)
  }

  extras.version = extras.version || 1
  extras.updatedAt = new Date().toISOString()
  extras.items = sortKeys(extras.items)
  return { ok: true, status: 200, message: lines.join('\n') || 'no changes' }
}

/** Remove extras rows by catalog key. Missing keys are reported and do not fail the call. */
export function deleteItemExtras(extras, keys) {
  if (!Array.isArray(keys) || keys.some((key) => typeof key !== 'string' || !key)) {
    return { ok: false, status: 400, message: 'body must be an array of catalog keys' }
  }
  let count = 0
  const missing = []
  for (const key of keys) {
    if (extras.items[key]) {
      delete extras.items[key]
      count++
    } else {
      missing.push(key)
    }
  }
  extras.updatedAt = new Date().toISOString()
  extras.items = sortKeys(extras.items)
  const lines = [`removed ${count} extras row(s)`]
  for (const key of missing) lines.push(`not found: ${key}`)
  return { ok: true, status: 200, message: lines.join('\n') }
}

export function mountItemExtras(app, state) {
  app.get('/item-extras', (req, res) => {
    res.type('json').send(`${JSON.stringify(state.itemExtras, null, 2)}\n`)
  })
  app.post('/item-extras/diff', (req, res) => {
    const result = applyItemExtrasDiff(state.itemExtras, req.body)
    res.status(result.status).end(result.message)
  })
  app.post('/item-extras/delete', (req, res) => {
    const result = deleteItemExtras(state.itemExtras, req.body)
    res.status(result.status).end(result.message)
  })
}
