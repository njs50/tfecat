import type { CharacterStats } from './presets/types'

/** Native item fields exposed as Item Property filter options. */
export const NATIVE_ITEM_PROPERTIES = [
  'Armor Class',
  'Base Cost',
  'Global Armor',
  'Remort Level',
] as const

/** Computed Item Property keys. */
export const COMPUTED_ITEM_PROPERTIES = ['regen', 'resist', 'smart'] as const

/** Always merge into the Item Property dropdown (sorted with catalog properties). */
export const EXTRA_ITEM_PROPERTIES: readonly string[] = [
  ...NATIVE_ITEM_PROPERTIES,
  ...COMPUTED_ITEM_PROPERTIES,
]

/** Resolved primary stats for softcaps (unset / no profile → 0, not CLI’s default 15). */
export type ResolvedCharacterStats = {
  Str: number
  Int: number
  Wis: number
  Dex: number
  Con: number
  Magic: number
  Fire: number
  Cold: number
  Mind: number
  Electric: number
  Acid: number
  Poison: number
}

const ZERO_STATS: ResolvedCharacterStats = {
  Str: 0,
  Int: 0,
  Wis: 0,
  Dex: 0,
  Con: 0,
  Magic: 0,
  Fire: 0,
  Cold: 0,
  Mind: 0,
  Electric: 0,
  Acid: 0,
  Poison: 0,
}

export function resolveCharacterStats(
  stats: CharacterStats | null | undefined,
): ResolvedCharacterStats {
  const n = (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? 0 : v
  return {
    ...ZERO_STATS,
    Str: n(stats?.Str),
    Int: n(stats?.Int),
    Wis: n(stats?.Wis),
    Dex: n(stats?.Dex),
    Con: n(stats?.Con),
  }
}

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

type AffectRow = { type?: string; name?: string; amount?: unknown }

function propertyRows(item: { affects?: AffectRow[] }): AffectRow[] {
  return (item.affects ?? []).filter((a) => a.type === 'property' && a.name)
}

function rawPropertyAmount(item: { affects?: AffectRow[] }, propertyName: string): number | null {
  const needle = propertyName.toLowerCase()
  const aff = propertyRows(item).find((a) => a.name!.toLowerCase() === needle)
  if (!aff) {
    return null
  }
  return parseNumeric(aff.amount) ?? 0
}

/** Softcap: positive primary-stat props ignored once that stat is already ≥ 30. */
function softcappedPrimaryStat(
  amount: number,
  currentStat: number,
): number {
  if (currentStat < 30 || amount < 0) {
    return amount
  }
  return 0
}

function getCappedMaxRes(
  stats: ResolvedCharacterStats,
  type: keyof ResolvedCharacterStats,
  amt: number,
): number {
  const currentMax = 100 - (stats[type] || 0)
  return Math.min(amt, currentMax)
}

/**
 * Resolve the sortable/filterable amount for an Item Property selection.
 * Returns null when the item does not have that property (filtered out).
 *
 * Softcaps mirror Mudlet `catalog.getAffect` for Str/Int/Wis/Dex/Con (≥30 ignores
 * positive primary-stat props) and related bonuses (smart, hit_regen, mana_regen,
 * damroll, magic, mind, poison). Unset / missing character stats count as 0.
 *
 * Deflection = raw Deflection + Global Armor (no skill weights).
 * regen = raw hit+mana+move regen (no extra Con/Int from the composite key).
 * resist = sum of elemental resists via the same resolver (magic/mind/poison softcaps apply).
 */
export function getItemPropertyAmount(
  item: any,
  propertyName: string,
  characterStats?: CharacterStats | null,
): number | null {
  if (!propertyName) {
    return null
  }

  const stats = resolveCharacterStats(characterStats)

  if ((NATIVE_ITEM_PROPERTIES as readonly string[]).includes(propertyName)) {
    return parseNumeric(item?.[propertyName])
  }

  const key = propertyName.toLowerCase()
  const rows = propertyRows(item)

  if (key === 'regen') {
    let sum = 0
    let found = false
    for (const name of ['hit_regen', 'mana_regen', 'move_regen']) {
      const amt = rawPropertyAmount(item, name)
      if (amt !== null) {
        found = true
        sum += amt
      }
    }
    return found ? sum : null
  }

  if (key === 'resist') {
    const types = ['fire', 'cold', 'electricity', 'acid', 'magic', 'mind', 'poison']
    let sum = 0
    let found = false
    for (const t of types) {
      const amt = getItemPropertyAmount(item, t, characterStats)
      if (amt !== null) {
        found = true
        sum += amt
      }
    }
    return found ? sum : null
  }

  if (key === 'smart') {
    let sum = 0
    let found = false
    for (const aff of rows) {
      const name = aff.name!.toLowerCase()
      const amount = parseNumeric(aff.amount)
      if (amount === null) continue
      if (name === 'intelligence') {
        found = true
        if (stats.Int < 30) sum += amount
      } else if (name === 'wisdom') {
        found = true
        if (stats.Wis < 30) sum += amount
      }
    }
    return found ? sum : null
  }

  if (key === 'deflection') {
    const deflection = rawPropertyAmount(item, 'Deflection')
    const globalArmor = parseNumeric(item?.['Global Armor'])
    if (deflection === null && globalArmor === null) {
      return null
    }
    return (deflection ?? 0) + (globalArmor ?? 0)
  }

  if (key === 'strength') {
    const amount = rawPropertyAmount(item, 'Strength')
    return amount === null ? null : softcappedPrimaryStat(amount, stats.Str)
  }
  if (key === 'intelligence') {
    const amount = rawPropertyAmount(item, 'Intelligence')
    return amount === null ? null : softcappedPrimaryStat(amount, stats.Int)
  }
  if (key === 'wisdom') {
    const amount = rawPropertyAmount(item, 'Wisdom')
    return amount === null ? null : softcappedPrimaryStat(amount, stats.Wis)
  }
  if (key === 'dexterity') {
    const amount = rawPropertyAmount(item, 'Dexterity')
    return amount === null ? null : softcappedPrimaryStat(amount, stats.Dex)
  }
  if (key === 'constitution') {
    const amount = rawPropertyAmount(item, 'Constitution')
    return amount === null ? null : softcappedPrimaryStat(amount, stats.Con)
  }

  if (key === 'hit_regen') {
    let sum = 0
    let found = false
    for (const aff of rows) {
      const name = aff.name!.toLowerCase()
      const amount = parseNumeric(aff.amount)
      if (amount === null) continue
      if (name === 'constitution' && stats.Con < 30) {
        found = true
        sum += amount * 0.6
      }
      if (name === 'hit_regen') {
        found = true
        sum += amount
      }
    }
    return found ? sum : null
  }

  if (key === 'mana_regen') {
    let sum = 0
    let found = false
    for (const aff of rows) {
      const name = aff.name!.toLowerCase()
      const amount = parseNumeric(aff.amount)
      if (amount === null) continue
      if (name === 'intelligence' && stats.Int < 30) {
        found = true
        sum += amount * 0.2
      }
      if (name === 'mana_regen') {
        found = true
        sum += amount
      }
    }
    return found ? sum : null
  }

  if (key === 'damroll') {
    let sum = 0
    let found = false
    for (const aff of rows) {
      const name = aff.name!.toLowerCase()
      const amount = parseNumeric(aff.amount)
      if (amount === null) continue
      if (name === 'strength' && stats.Str < 30) {
        found = true
        sum += amount * 0.33
      }
      if (name === 'damroll') {
        found = true
        sum += amount
      }
    }
    // Site damroll filter historically used the property only (not weapon avg damage).
    return found ? sum : null
  }

  if (key === 'magic') {
    let sum = 0
    let found = false
    for (const aff of rows) {
      const name = aff.name!.toLowerCase()
      const amount = parseNumeric(aff.amount)
      if (amount === null) continue
      if (name === 'intelligence' && stats.Int < 30) {
        found = true
        sum += amount * 2
      }
      if (name === 'wisdom' && stats.Wis < 30) {
        found = true
        sum += amount
      }
      if (name === 'magic') {
        found = true
        sum += amount
      }
    }
    return found ? getCappedMaxRes(stats, 'Magic', sum) : null
  }

  if (key === 'mind') {
    let sum = 0
    let found = false
    for (const aff of rows) {
      const name = aff.name!.toLowerCase()
      const amount = parseNumeric(aff.amount)
      if (amount === null) continue
      if (name === 'intelligence' && stats.Int < 30) {
        found = true
        sum += amount
      }
      if (name === 'wisdom' && stats.Wis < 30) {
        found = true
        sum += amount * 2
      }
      if (name === 'mind') {
        found = true
        sum += amount
      }
    }
    return found ? getCappedMaxRes(stats, 'Mind', sum) : null
  }

  if (key === 'poison') {
    let sum = 0
    let found = false
    for (const aff of rows) {
      const name = aff.name!.toLowerCase()
      const amount = parseNumeric(aff.amount)
      if (amount === null) continue
      if (name === 'constitution' && stats.Con < 30) {
        found = true
        sum += amount * 2
      }
      if (name === 'poison') {
        found = true
        sum += amount
      }
    }
    return found ? getCappedMaxRes(stats, 'Poison', sum) : null
  }

  // Fire/cold/electricity/acid (and other plain properties): raw amount.
  // Resist cap only applies on the special hasAff paths in CLI; plain fire returns early.
  return rawPropertyAmount(item, propertyName)
}
