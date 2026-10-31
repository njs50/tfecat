/** Named set of item-property → weight multipliers for weighted search. */
export type WeightConfig = {
  id: string
  name: string
  /** Property display names (catalog casing / extras) → weight. */
  weights: Record<string, number>
}

/** Primary stats used by Mudlet `tcat` softcaps (Str/Int/Wis/Dex/Con). */
export type CharacterStats = {
  Str: number | null
  Int: number | null
  Wis: number | null
  Dex: number | null
  Con: number | null
}

export const EMPTY_CHARACTER_STATS: CharacterStats = {
  Str: null,
  Int: null,
  Wis: null,
  Dex: null,
  Con: null,
}

/** Named character filter preset. */
export type CharacterProfile = {
  id: string
  name: string
  /** Max item level; selecting the profile sets level range to [1, level]. */
  level: number
  alignment: string | null
  race: string | null
  class: string | null
  gender: string | null
  /** Unset stats are treated as 0 for softcaps (same as no profile selected). */
  stats: CharacterStats
}

export type PresetsState = {
  weightConfigs: WeightConfig[]
  characterProfiles: CharacterProfile[]
  activeWeightConfigId: string | null
  activeCharacterProfileId: string | null
}
