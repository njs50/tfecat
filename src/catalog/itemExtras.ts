/**
 * Sidecar item attributes (equipable / size) merged from public/item-extras.json.
 * Independent of catalog refresh; keyed by catalogKey.
 */

/** Game sizes, smallest to largest (`help sizes`). */
export const GAME_SIZES = [
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
] as const

/**
 * Player races. On an item, a race name is a size that fits only that race.
 * gnome, human, and ogre are also game sizes.
 */
export const PLAYER_RACES = [
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
] as const

const GAME_SIZE_SET = new Set<string>(GAME_SIZES)

/** Game sizes first, then race-only names. */
export const KNOWN_SIZE_TOKENS = [
  ...GAME_SIZES,
  ...PLAYER_RACES.filter((race) => !GAME_SIZE_SET.has(race)),
] as const

export type KnownSizeToken = (typeof KNOWN_SIZE_TOKENS)[number]

/**
 * Body size of a race, when the race name is itself a game size.
 * Other races are unset: they match an item only when the item names that race.
 */
const RACE_BODY_SIZE: Record<string, string> = {
  gnome: 'gnome',
  human: 'human',
  ogre: 'ogre',
}

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

/** Body size for a race, or null when that race has no known game size yet. */
export function characterSizeForRace(race: string | null | undefined): string | null {
  if (!race) return null
  return RACE_BODY_SIZE[race.toLowerCase()] ?? null
}

const SIZE_RANK = new Map<string, number>(GAME_SIZES.map((size, index) => [size, index]))

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
    const ra = SIZE_RANK.get(a) ?? 100
    const rb = SIZE_RANK.get(b) ?? 100
    if (ra !== rb) return ra - rb
    return a.localeCompare(b)
  })
}

export function formatSizeDisplay(sizes: string[]): string {
  return sizes.map((size) => size.charAt(0).toUpperCase() + size.slice(1)).join(', ')
}

/**
 * Item size OK when extSize is omitted, or (with a race selected) some token
 * is that race or that race's body size. A race token fits only that race.
 * Empty array = blocked by size for everyone.
 */
export function itemSizeAllowedForRace(
  extSize: string[] | null | undefined,
  charRace: string | null | undefined,
): boolean {
  if (extSize == null) return true
  if (!charRace) return true
  if (extSize.length === 0) return false
  const race = charRace.toLowerCase()
  const bodySize = characterSizeForRace(race)
  return extSize.some((token) => token === race || (bodySize != null && token === bodySize))
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
