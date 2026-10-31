import type { LocationQuery, LocationQueryRaw } from 'vue-router'

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

/** Serialize catalog filters into vue-router query params. */
export function catalogStateToQuery(state: CatalogFilterState): LocationQueryRaw {
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
  if (state.activeWeightConfigId) {
    query.weights = state.activeWeightConfigId
  } else if (state.itemProperty) {
    query.property = state.itemProperty
  }
  if (state.activeCharacterProfileId) {
    query.character = state.activeCharacterProfileId
  }
  return query
}

/** Parse route query into catalog filter fields (partial). */
export function catalogQueryToState(query: LocationQuery): Partial<CatalogFilterState> {
  const state: Partial<CatalogFilterState> = {}

  const q = str(query.q)
  state.searchText = q ?? ''

  const level = str(query.level)
  if (level && /^\d+-\d+$/.test(level)) {
    const [a, b] = level.split('-').map(Number)
    state.levelRange = [
      Math.min(90, Math.max(0, a)),
      Math.min(90, Math.max(0, b)),
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
  state.activeWeightConfigId = str(query.weights)
  state.activeCharacterProfileId = str(query.character)
  state.itemProperty = state.activeWeightConfigId ? null : str(query.property)

  return state
}

export function sameCatalogQuery(a: LocationQueryRaw, b: LocationQuery): boolean {
  const norm = (q: LocationQueryRaw | LocationQuery) => {
    const keys = Object.keys(q).sort()
    return keys.map((k) => `${k}=${String((q as Record<string, unknown>)[k] ?? '')}`).join('&')
  }
  return norm(a) === norm(b)
}
