import { getItemPropertyAmount } from '../itemProperties'
import { getWeightedScore } from '../presets/weightedScore'
import type { CharacterStats } from '../presets/types'

/** Filter state shared by Item catalog and Item audit. */
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
  weights: Record<string, number> | null
  characterStats: CharacterStats | null
}

export type ScoredCatalogItem = Record<string, unknown> & {
  propertyAmount: number | null
  weightedScore: number | null
}

/** Same pass as CatalogView.catalog — filters then scores. */
export function applyCatalogFilters(
  catalog: any[] | null | undefined,
  state: CatalogFilterState,
): ScoredCatalogItem[] {
  if (!catalog?.length) return []

  const filtered = catalog.filter((item: any) => {
    if (state.searchText) {
      const q = state.searchText.toLowerCase()
      if (
        String(item['Unidentified Name'] ?? '')
          .toLowerCase()
          .indexOf(q) === -1 &&
        String(item.buffer ?? '')
          .toLowerCase()
          .indexOf(q) === -1 &&
        String(item.name ?? '')
          .toLowerCase()
          .indexOf(q) === -1
      ) {
        return false
      }
    }
    if (state.itemType && item.itemType !== state.itemType) return false
    if (state.itemClass && (!item.Class || item.Class !== state.itemClass)) return false
    if (state.itemAffect) {
      if (!item.affects || !item.affects.find((aff: any) => aff.name === state.itemAffect)) {
        return false
      }
    }
    if (!state.weights && state.itemProperty) {
      if (getItemPropertyAmount(item, state.itemProperty, state.characterStats) === null) {
        return false
      }
    }
    if (state.itemSlot) {
      if (!item['Wear Loc.'] || item['Wear Loc.'].indexOf(state.itemSlot) < 0) return false
    }
    if (state.itemLayer) {
      if (!item.Layer || item.Layer.indexOf(state.itemLayer) < 0) return false
    }
    if (state.charAlignment && !item.charAlignments?.[state.charAlignment]) return false
    if (state.charRace && !item.charRaces?.[state.charRace.toLowerCase()]) return false
    if (state.charClass && !item.charClasses?.[state.charClass.toLowerCase()]) return false
    if (state.charGender && !item.charGenders?.[state.charGender.toLowerCase()]) return false
    if (item.Level < state.levelRange[0] || item.Level > state.levelRange[1]) return false
    return true
  })

  return filtered.map((item: any) => ({
    ...item,
    propertyAmount:
      !state.weights && state.itemProperty
        ? getItemPropertyAmount(item, state.itemProperty, state.characterStats)
        : null,
    weightedScore: state.weights
      ? getWeightedScore(item, state.weights, state.characterStats)
      : null,
  }))
}

/** Score used for audit ranking (weights win; else item property). */
export function catalogScore(
  item: ScoredCatalogItem,
  state: Pick<CatalogFilterState, 'weights' | 'itemProperty' | 'characterStats'>,
): number | null {
  if (state.weights) {
    return item.weightedScore
  }
  if (state.itemProperty) {
    return item.propertyAmount
  }
  return null
}
