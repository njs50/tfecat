/** Native item fields exposed as Item Property filter options. */
export const NATIVE_ITEM_PROPERTIES = [
  'Armor Class',
  'Base Cost',
  'Global Armor',
  'Remort Level',
] as const

/** Computed Item Property keys (raw catalog amounts only; no Mudlet stat bonuses). */
export const COMPUTED_ITEM_PROPERTIES = ['regen', 'resist', 'smart'] as const

/** Always merge into the Item Property dropdown (sorted with catalog properties). */
export const EXTRA_ITEM_PROPERTIES: readonly string[] = [
  ...NATIVE_ITEM_PROPERTIES,
  ...COMPUTED_ITEM_PROPERTIES,
]

const REGEN_PROPERTY_NAMES = ['hit_regen', 'mana_regen', 'move_regen']
const RESIST_PROPERTY_NAMES = [
  'fire',
  'cold',
  'electricity',
  'acid',
  'magic',
  'mind',
  'poison',
]
const SMART_PROPERTY_NAMES = ['intelligence', 'wisdom']

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

/** Sum raw `type: property` amounts whose names match (case-insensitive). */
function sumPropertiesByName(
  item: { affects?: { type?: string; name?: string; amount?: unknown }[] },
  names: string[],
): { sum: number; found: boolean } {
  const wanted = new Set(names.map((n) => n.toLowerCase()))
  let sum = 0
  let found = false
  for (const aff of item.affects ?? []) {
    if (aff.type !== 'property' || !aff.name) {
      continue
    }
    if (!wanted.has(aff.name.toLowerCase())) {
      continue
    }
    found = true
    const amount = parseNumeric(aff.amount)
    if (amount !== null) {
      sum += amount
    }
  }
  return { sum, found }
}

function rawPropertyAmount(
  item: { affects?: { type?: string; name?: string; amount?: unknown }[] },
  propertyName: string,
): number | null {
  const needle = propertyName.toLowerCase()
  const aff = (item.affects ?? []).find(
    (a) => a.type === 'property' && a.name?.toLowerCase() === needle,
  )
  if (!aff) {
    return null
  }
  return parseNumeric(aff.amount) ?? 0
}

/**
 * Resolve the sortable/filterable amount for an Item Property selection.
 * Returns null when the item does not have that property (filtered out).
 *
 * Deflection = raw Deflection property + Global Armor (no skill weights).
 * regen / resist / smart = raw property sums only.
 */
export function getItemPropertyAmount(item: any, propertyName: string): number | null {
  if (!propertyName) {
    return null
  }

  if ((NATIVE_ITEM_PROPERTIES as readonly string[]).includes(propertyName)) {
    return parseNumeric(item?.[propertyName])
  }

  if (propertyName === 'regen') {
    const { sum, found } = sumPropertiesByName(item, REGEN_PROPERTY_NAMES)
    return found ? sum : null
  }

  if (propertyName === 'resist') {
    const { sum, found } = sumPropertiesByName(item, RESIST_PROPERTY_NAMES)
    return found ? sum : null
  }

  if (propertyName === 'smart') {
    const { sum, found } = sumPropertiesByName(item, SMART_PROPERTY_NAMES)
    return found ? sum : null
  }

  if (propertyName.toLowerCase() === 'deflection') {
    const deflection = rawPropertyAmount(item, 'Deflection')
    const globalArmor = parseNumeric(item?.['Global Armor'])
    if (deflection === null && globalArmor === null) {
      return null
    }
    return (deflection ?? 0) + (globalArmor ?? 0)
  }

  return rawPropertyAmount(item, propertyName)
}
