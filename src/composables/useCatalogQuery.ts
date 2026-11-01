import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import { LEVEL_MAX, LEVEL_MIN, UNSAVED_PRESET_ID } from '../presets/constants'
import type { CharacterProfile, CharacterStats, WeightConfig } from '../presets/types'

export type CatalogFilterState = {
  searchText: string
  levelRange: [number, number]
  charAlignment: string | null
  charClass: string | null
  charRace: string | null
  charGender: string | null
  itemType: string | null
  itemClass: string | null
  itemAffect: string | null
  itemProperty: string | null
  itemSlot: string | null
  itemLayer: string | null
  activeWeightConfigId: string | null
  activeCharacterProfileId: string | null
}

const str = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length) {
    return value
  }
  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length) {
    return value[0]
  }
  return null
}

const num = (value: unknown): number | null => {
  const s = str(value)
  if (s == null) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Encode weight map for share URLs: Prop:1.5|Other:2 */
export function encodeWeightsParam(weights: Record<string, number>): string {
  return Object.entries(weights)
    .filter(([, w]) => Number.isFinite(w))
    .map(([k, w]) => `${encodeURIComponent(k)}:${w}`)
    .join('|')
}

export function decodeWeightsParam(raw: string | null): Record<string, number> | null {
  if (!raw) return null
  const weights: Record<string, number> = {}
  for (const part of raw.split('|')) {
    if (!part) continue
    const idx = part.lastIndexOf(':')
    if (idx <= 0) continue
    let key = part.slice(0, idx)
    try {
      key = decodeURIComponent(key)
    } catch {
      /* keep raw */
    }
    const w = Number(part.slice(idx + 1))
    if (key && Number.isFinite(w)) {
      weights[key] = w
    }
  }
  return Object.keys(weights).length ? weights : null
}

/** Serialize catalog filters into vue-router query params (internal navigation). */
export function catalogStateToQuery(
  state: CatalogFilterState,
  extras?: {
    activeProfile?: CharacterProfile | null
    activeWeights?: WeightConfig | null
  },
): LocationQueryRaw {
  const query: LocationQueryRaw = {}
  if (state.searchText) {
    query.q = state.searchText
  }
  const [lo, hi] = state.levelRange
  if (lo !== 0 || hi !== 90) {
    query.level = `${lo}-${hi}`
  }
  if (state.charAlignment) query.align = state.charAlignment
  if (state.charRace) query.race = state.charRace
  if (state.charClass) query.class = state.charClass
  if (state.charGender) query.gender = state.charGender
  if (state.itemType) query.type = state.itemType
  if (state.itemClass) query.itemClass = state.itemClass
  if (state.itemAffect) query.affect = state.itemAffect
  if (state.itemSlot) query.slot = state.itemSlot
  if (state.itemLayer) query.layer = state.itemLayer

  const weightId = state.activeWeightConfigId
  if (weightId === UNSAVED_PRESET_ID && extras?.activeWeights) {
    query.w = encodeWeightsParam(extras.activeWeights.weights)
  } else if (weightId) {
    query.weights = weightId
  } else if (state.itemProperty) {
    query.property = state.itemProperty
  }

  const charId = state.activeCharacterProfileId
  if (charId === UNSAVED_PRESET_ID && extras?.activeProfile) {
    query.character = UNSAVED_PRESET_ID
    appendProfileFields(query, extras.activeProfile)
  } else if (charId) {
    query.character = charId
  }

  return query
}

function appendProfileFields(query: LocationQueryRaw, profile: CharacterProfile) {
  query.level = `1-${profile.level}`
  if (profile.alignment) query.align = profile.alignment
  if (profile.race) query.race = profile.race
  if (profile.class) query.class = profile.class
  if (profile.gender) query.gender = profile.gender
  if (profile.stats.Str != null) query.str = String(profile.stats.Str)
  if (profile.stats.Int != null) query.int = String(profile.stats.Int)
  if (profile.stats.Wis != null) query.wis = String(profile.stats.Wis)
  if (profile.stats.Dex != null) query.dex = String(profile.stats.Dex)
  if (profile.stats.Con != null) query.con = String(profile.stats.Con)
}

/**
 * Build a shareable query: expand saved profile/weights into concrete values
 * (no saved ids). Recipients get an &lt;unsaved&gt; selection they can keep.
 */
export function buildShareQuery(
  state: CatalogFilterState,
  activeProfile: CharacterProfile | null,
  activeWeights: WeightConfig | null,
): LocationQueryRaw {
  const query: LocationQueryRaw = {}
  if (state.searchText) query.q = state.searchText
  const [lo, hi] = state.levelRange
  if (lo !== 0 || hi !== 90) query.level = `${lo}-${hi}`
  if (state.charAlignment) query.align = state.charAlignment
  if (state.charRace) query.race = state.charRace
  if (state.charClass) query.class = state.charClass
  if (state.charGender) query.gender = state.charGender
  if (state.itemType) query.type = state.itemType
  if (state.itemClass) query.itemClass = state.itemClass
  if (state.itemAffect) query.affect = state.itemAffect
  if (state.itemSlot) query.slot = state.itemSlot
  if (state.itemLayer) query.layer = state.itemLayer

  if (activeWeights && Object.keys(activeWeights.weights).length) {
    query.w = encodeWeightsParam(activeWeights.weights)
  } else if (state.itemProperty) {
    query.property = state.itemProperty
  }

  if (activeProfile) {
    appendProfileFields(query, activeProfile)
    // Marker so openers create an &lt;unsaved&gt; profile even if filters alone look empty.
    query.character = UNSAVED_PRESET_ID
  }

  return query
}

export type ParsedCatalogQuery = Partial<CatalogFilterState> & {
  sharedWeights: Record<string, number> | null
  sharedStats: CharacterStats | null
  wantsUnsavedCharacter: boolean
}

/** Parse route query into catalog filter fields + shared preset payloads. */
export function catalogQueryToState(query: LocationQuery): ParsedCatalogQuery {
  const state: ParsedCatalogQuery = {
    sharedWeights: null,
    sharedStats: null,
    wantsUnsavedCharacter: false,
  }

  const q = str(query.q)
  state.searchText = q ?? ''

  const level = str(query.level)
  if (level && /^\d+-\d+$/.test(level)) {
    const [a, b] = level.split('-').map(Number)
    state.levelRange = [
      Math.min(LEVEL_MAX, Math.max(0, a)),
      Math.min(LEVEL_MAX, Math.max(0, b)),
    ]
  } else {
    state.levelRange = [0, 90]
  }

  state.charAlignment = str(query.align)
  state.charRace = str(query.race)
  state.charClass = str(query.class)
  state.charGender = str(query.gender)
  state.itemType = str(query.type)
  state.itemClass = str(query.itemClass)
  state.itemAffect = str(query.affect)
  state.itemSlot = str(query.slot)
  state.itemLayer = str(query.layer)

  const sharedWeights = decodeWeightsParam(str(query.w))
  state.sharedWeights = sharedWeights
  const weightId = str(query.weights)
  if (sharedWeights) {
    state.activeWeightConfigId = UNSAVED_PRESET_ID
    state.itemProperty = null
  } else if (weightId && weightId !== UNSAVED_PRESET_ID) {
    state.activeWeightConfigId = weightId
    state.itemProperty = null
  } else {
    state.activeWeightConfigId = null
    state.itemProperty = str(query.property)
  }

  const stats: CharacterStats = {
    Str: num(query.str),
    Int: num(query.int),
    Wis: num(query.wis),
    Dex: num(query.dex),
    Con: num(query.con),
  }
  const hasStats = Object.values(stats).some((v) => v != null)
  state.sharedStats = hasStats ? stats : null

  const characterId = str(query.character)
  const wantsUnsaved =
    characterId === UNSAVED_PRESET_ID ||
    (hasStats && (!characterId || characterId === UNSAVED_PRESET_ID))
  state.wantsUnsavedCharacter = !!wantsUnsaved

  if (wantsUnsaved) {
    state.activeCharacterProfileId = UNSAVED_PRESET_ID
  } else if (characterId) {
    state.activeCharacterProfileId = characterId
  } else {
    state.activeCharacterProfileId = null
  }

  return state
}

export function sameCatalogQuery(a: LocationQueryRaw, b: LocationQuery): boolean {
  const norm = (q: LocationQueryRaw | LocationQuery) => {
    const keys = Object.keys(q).sort()
    return keys.map((k) => `${k}=${String((q as Record<string, unknown>)[k] ?? '')}`).join('&')
  }
  return norm(a) === norm(b)
}

export function clampProfileLevel(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return 50
  return Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.round(v)))
}
