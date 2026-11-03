import { DEFAULT_STAT_VALUE } from './constants'

/** Named set of item-property → weight multipliers for weighted search. */
export type WeightConfig = {
  id: string
  name: string
  /** Property display names (catalog casing / extras) → weight. */
  weights: Record<string, number>
  /**
   * Built-in starter profiles (Fighter / Healer / Wizard).
   * Not persisted; weights cannot be overwritten — rename + Save creates a user copy.
   */
  builtin?: boolean
}

/** Primary stats used by Mudlet `tcat` softcaps (Str/Int/Wis/Dex/Con). */
export type CharacterStats = {
  Str: number | null
  Int: number | null
  Wis: number | null
  Dex: number | null
  Con: number | null
}

/** Default filled stats for new profiles / softcap baseline. */
export const DEFAULT_CHARACTER_STATS: CharacterStats = {
  Str: DEFAULT_STAT_VALUE,
  Int: DEFAULT_STAT_VALUE,
  Wis: DEFAULT_STAT_VALUE,
  Dex: DEFAULT_STAT_VALUE,
  Con: DEFAULT_STAT_VALUE,
}

/** @deprecated use DEFAULT_CHARACTER_STATS */
export const EMPTY_CHARACTER_STATS = DEFAULT_CHARACTER_STATS

/** Named Mudlet equipment dump belonging to a character profile (Item Audit). */
export type CharacterGearSet = {
  id: string
  name: string
  /** Raw Mudlet `equipment` paste (`+++ Equipment +++` dump). */
  paste: string
}

/** Named character filter preset. */
export type CharacterProfile = {
  id: string
  name: string
  /** Character level; selecting the profile pre-sets filter max level (min unchanged). */
  level: number
  alignment: string | null
  race: string | null
  class: string | null
  gender: string | null
  /** Null entries resolve to DEFAULT_STAT_VALUE for softcaps. */
  stats: CharacterStats
  /** Named gear dumps for Item Audit (multiple per profile). */
  gearSets?: CharacterGearSet[]
  /** Last gear set selected on Item Audit for this profile. */
  activeGearSetId?: string | null
  /**
   * @deprecated Migrated into `gearSets` on load. Kept optional for old localStorage.
   */
  equipmentPaste?: string
}

export type PresetsState = {
  weightConfigs: WeightConfig[]
  characterProfiles: CharacterProfile[]
  activeWeightConfigId: string | null
  activeCharacterProfileId: string | null
}
