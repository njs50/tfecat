/** Named set of item-property → weight multipliers for weighted search. */
export type WeightConfig = {
  id: string
  name: string
  /** Property display names (catalog casing / extras) → weight. */
  weights: Record<string, number>
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
}

export type PresetsState = {
  weightConfigs: WeightConfig[]
  characterProfiles: CharacterProfile[]
  activeWeightConfigId: string | null
  activeCharacterProfileId: string | null
}
