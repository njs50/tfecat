/**
 * Sidecar item attributes (equipable / size) merged from public/item-extras.json.
 * Independent of catalog refresh; keyed by catalogKey.
 */

/** Common size tokens; extras may also store other lowercase tags (giant, ogre, …). */
export const KNOWN_SIZE_TOKENS = [
  'tiny',
  'small',
  'medium',
  'large',
  'giant',
  'ogre',
  'huge',
] as const

export type KnownSizeToken = (typeof KNOWN_SIZE_TOKENS)[number]

const LARGE_RACES = new Set(['ent', 'ogre', 'troll'])
const SMALL_RACES = new Set(['dwarf', 'gnome', 'goblin', 'halfling'])

export type ItemExtraRow = {
  equipable?: boolean | null
  size?: string[]
  updatedAt?: string
  note?: string
}

export type ItemExtrasFile = {
  version: number
  updatedAt: string
  items: Record<string, ItemExtraRow>
}

export const EMPTY_ITEM_EXTRAS: ItemExtrasFile = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  items: {},
}

/** Nick’s race → single wearer size. Remaining races (incl. human/elf/orc/centaur/…) → medium. */
export function characterSizeForRace(race: string | null | undefined): string | null {
  if (!race) return null
  const r = race.toLowerCase()
  if (LARGE_RACES.has(r)) return 'large'
  if (SMALL_RACES.has(r)) return 'small'
  return 'medium'
}

const SIZE_RANK: Record<string, number> = {
  tiny: 0,
  small: 1,
  medium: 2,
  large: 3,
  giant: 4,
  ogre: 4,
  huge: 5,
}

/** Normalize comma-separated or array input to unique lowercase tokens (size-rank order). */
export function normalizeSizeTokens(input: string | string[] | null | undefined): string[] {
  if (input == null) return []
  const parts = Array.isArray(input) ? input : String(input).split(',')
  const out = new Set<string>()
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

export function formatSizeDisplay(sizes: string[]): string {
  return sizes.join(', ')
}

/**
 * Item size OK when extSize is unknown/omitted, or (with a race selected)
 * intersection of item sizes and the character’s single race size is non-empty.
 * Empty array = blocked by size for everyone.
 */
export function itemSizeAllowedForRace(
  extSize: string[] | null | undefined,
  charRace: string | null | undefined,
): boolean {
  if (extSize == null) return true
  if (!charRace) return true
  if (extSize.length === 0) return false
  const charSize = characterSizeForRace(charRace)
  if (!charSize) return true
  return extSize.includes(charSize)
}

export function mergeItemExtras(item: Record<string, unknown>, extra: ItemExtraRow | undefined): void {
  if (!extra) {
    item.extEquipable = null
    item.extSize = null
    return
  }
  item.extEquipable = extra.equipable ?? null
  item.extSize =
    extra.size === undefined || extra.size === null
      ? null
      : normalizeSizeTokens(extra.size)
}

/** Sidecar equipable/size only (anti-flags handled by catalogItemAllowedByCharacter). */
export function catalogItemAllowedByExtras(
  item: any,
  charRace: string | null | undefined,
): boolean {
  if (item?.extEquipable === false) return false
  if (!itemSizeAllowedForRace(item?.extSize, charRace)) return false
  return true
}
