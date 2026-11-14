/**
 * Sidecar item attributes (equipable / size) merged from public/item-extras.json.
 * Independent of catalog refresh; keyed by catalogKey.
 */

/** Player body sizes. A character's size comes from race. */
export const PLAYER_SIZES = ['small', 'medium', 'large'] as const

/** Races offered by the character editors. A race name on an item is a size that fits only that race. */
export const PLAYER_RACES = [
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
] as const

/** Pet and monster sizes. No player matches these. */
export const PET_SIZES = ['ant', 'rat', 'dog', 'horse', 'giant', 'elephant', 'dinosaur'] as const

export const KNOWN_SIZE_TOKENS = [...PLAYER_SIZES, ...PLAYER_RACES, ...PET_SIZES] as const

export type KnownSizeToken = (typeof KNOWN_SIZE_TOKENS)[number]

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

const LARGE_RACES = new Set(['ent', 'ogre', 'troll'])
const SMALL_RACES = new Set(['dwarf', 'gnome', 'goblin', 'halfling'])
const PLAYER_RACE_SET = new Set<string>(PLAYER_RACES)

/** Nick's race → player size. Remaining player races are medium; unknown races have no size. */
export function characterSizeForRace(race: string | null | undefined): string | null {
  if (!race) return null
  const r = race.toLowerCase()
  if (LARGE_RACES.has(r)) return 'large'
  if (SMALL_RACES.has(r)) return 'small'
  return PLAYER_RACE_SET.has(r) ? 'medium' : null
}

const SIZE_RANK = new Map<string, number>(PLAYER_SIZES.map((size, index) => [size, index]))

/** Normalize comma-separated or array input to unique lowercase tokens (small, medium, large first). */
export function normalizeSizeTokens(input: string | string[] | null | undefined): string[] {
  if (input == null) return []
  const parts = Array.isArray(input) ? input : String(input).split(',')
  const out = new Set<string>()
  for (const part of parts) {
    const t = part.trim().toLowerCase()
    if (t) out.add(t)
  }
  return [...out].sort((a, b) => {
    const ra = SIZE_RANK.get(a) ?? 100
    const rb = SIZE_RANK.get(b) ?? 100
    if (ra !== rb) return ra - rb
    return a.localeCompare(b)
  })
}

export function displaySizeTokens(sizes: string[]): string[] {
  return sizes.map((size) => size.charAt(0).toUpperCase() + size.slice(1))
}

/**
 * Item size OK when extSize is omitted, or (with a race selected) some token is
 * that race or that race's player size. Empty array = blocked for everyone.
 */
export function itemSizeAllowedForRace(
  extSize: string[] | null | undefined,
  charRace: string | null | undefined,
): boolean {
  if (extSize == null) return true
  if (!charRace) return true
  if (extSize.length === 0) return false
  const race = charRace.toLowerCase()
  const size = characterSizeForRace(race)
  return extSize.some((token) => token === race || (size != null && token === size))
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
