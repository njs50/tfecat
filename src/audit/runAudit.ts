import { getItemPropertyAmount } from '../itemProperties'
import { getWeightedScore } from '../presets/weightedScore'
import {
  applyCatalogFilters,
  type CatalogFilterState,
  type ScoredCatalogItem,
} from '../catalog/applyFilters'
import { findCatalogItem } from './findCatalogItem'
import {
  EQUIPMENT_LAYERS,
  EQUIPMENT_SLOTS,
  SLOT_TO_WEAR_LOC,
  type EquipmentLayer,
  type ParseEquipmentResult,
  type ParsedGearPiece,
} from './parseEquipment'
import { itemSanitize } from './itemSanitize'

export type ResolvedGearPiece = ParsedGearPiece & {
  catalogItem: ScoredCatalogItem | null
  score: number | null
}

export type AuditUpgrade = {
  item: ScoredCatalogItem
  score: number
  delta: number
}

export type AuditSlotReport = {
  slot: string
  wearLoc: string
  layer: EquipmentLayer
  equipped: ResolvedGearPiece | null
  unmatchedRaw: string | null
  upgrades: AuditUpgrade[]
  empty: boolean
}

export type AuditReport = {
  slots: AuditSlotReport[]
  unmatched: ParsedGearPiece[]
  gearTotal: number | null
  scoringMode: 'weighted' | 'property' | 'none'
  propertyLabel: string | null
}

const DEFAULT_LIMIT = 10

function hasAffect(item: any, name: string): boolean {
  return !!item?.affects?.some(
    (a: any) => typeof a?.name === 'string' && a.name.toLowerCase() === name.toLowerCase(),
  )
}

function scoreItem(
  item: any,
  state: Pick<CatalogFilterState, 'weights' | 'itemProperty' | 'characterStats'>,
): number | null {
  if (state.weights) {
    return getWeightedScore(item, state.weights, state.characterStats)
  }
  if (state.itemProperty) {
    return getItemPropertyAmount(item, state.itemProperty, state.characterStats)
  }
  return null
}

/**
 * Build a Mudlet-style per-slot upgrade report using the SPA catalog filters.
 */
export function runEquipmentAudit(options: {
  parse: ParseEquipmentResult
  catalog: any[]
  filterState: CatalogFilterState
  limit?: number
  /** Include slots with no upgrades (CLI --verbose). */
  verbose?: boolean
  /** Treat equal scores as upgrades (CLI --sidegrades). */
  sidegrades?: boolean
}): AuditReport {
  const {
    parse,
    catalog,
    filterState,
    limit = DEFAULT_LIMIT,
    verbose = false,
    sidegrades = false,
  } = options

  const scoringMode: AuditReport['scoringMode'] = filterState.weights
    ? 'weighted'
    : filterState.itemProperty
      ? 'property'
      : 'none'
  const propertyLabel =
    scoringMode === 'weighted'
      ? 'weighted score'
      : scoringMode === 'property'
        ? filterState.itemProperty
        : null

  const basePool = applyCatalogFilters(catalog, {
    ...filterState,
    itemSlot: null,
    itemLayer: null,
  })

  const unmatched: ParsedGearPiece[] = []
  const resolvedBySlot: Record<
    string,
    Partial<Record<EquipmentLayer, ResolvedGearPiece>>
  > = {}

  for (const piece of parse.pieces) {
    const found = findCatalogItem(itemSanitize(piece.raw, true), catalog)
    const equippedItem: ScoredCatalogItem | null = found
      ? {
          ...found,
          propertyAmount:
            !filterState.weights && filterState.itemProperty
              ? getItemPropertyAmount(found, filterState.itemProperty, filterState.characterStats)
              : null,
          weightedScore: filterState.weights
            ? getWeightedScore(found, filterState.weights, filterState.characterStats)
            : null,
        }
      : null

    const resolved: ResolvedGearPiece = {
      ...piece,
      catalogItem: equippedItem,
      score: equippedItem ? scoreItem(equippedItem, filterState) : null,
    }
    if (!found) unmatched.push(piece)
    resolvedBySlot[piece.slot] = resolvedBySlot[piece.slot] ?? {}
    resolvedBySlot[piece.slot][piece.layer] = resolved
  }

  let usingTwoHandedWeapon = false
  const rightBase = resolvedBySlot['right hand']?.base?.catalogItem
  if (rightBase && rightBase.itemType === 'weapon' && hasAffect(rightBase, 'Requires two hands.')) {
    usingTwoHandedWeapon = true
  }

  const slots: AuditSlotReport[] = []
  let gearTotal = 0
  let gearCounted = false

  for (const slot of EQUIPMENT_SLOTS) {
    if (usingTwoHandedWeapon && slot === 'left hand') continue
    const wearLoc = SLOT_TO_WEAR_LOC[slot]
    if (!wearLoc) continue

    for (const layer of EQUIPMENT_LAYERS) {
      if (
        (slot === 'right hand' || slot === 'left hand') &&
        layer !== 'base' &&
        !resolvedBySlot[slot]?.[layer]
      ) {
        continue
      }

      const equipped = resolvedBySlot[slot]?.[layer] ?? null
      const empty = !equipped
      const equippedScore = equipped?.score ?? 0

      if (equipped?.score != null) {
        gearTotal += equipped.score
        gearCounted = true
      }

      if (scoringMode === 'none') {
        if (verbose || (equipped && !equipped.catalogItem)) {
          slots.push({
            slot,
            wearLoc,
            layer,
            equipped,
            unmatchedRaw: equipped && !equipped.catalogItem ? equipped.raw : null,
            upgrades: [],
            empty,
          })
        }
        continue
      }

      const candidates = basePool.filter((item) => {
        const wears = item['Wear Loc.']
        const layers = item.Layer
        if (!Array.isArray(wears) || wears.indexOf(wearLoc) < 0) return false
        if (!Array.isArray(layers) || layers.indexOf(layer) < 0) return false
        return true
      })

      const upgrades: AuditUpgrade[] = []
      for (const item of candidates) {
        const score = scoreItem(item, filterState)
        if (score == null) continue
        if (equipped?.catalogItem && item.catalogKey === equipped.catalogItem.catalogKey) {
          continue
        }
        const better = empty
          ? score > 0
          : sidegrades
            ? score >= equippedScore
            : score > equippedScore
        if (!better) continue
        upgrades.push({
          item,
          score,
          delta: score - equippedScore,
        })
      }

      upgrades.sort((a, b) => b.score - a.score || b.delta - a.delta)
      const trimmed = upgrades.slice(0, limit)

      if (/^(left|right) /.test(slot) && trimmed.length) {
        const altSlot = slot.includes('left')
          ? slot.replace('left', 'right')
          : slot.replace('right', 'left')
        const alt = resolvedBySlot[altSlot]?.[layer]
        if (alt?.catalogItem && !hasAffect(alt.catalogItem, 'Effects are additive.')) {
          for (let i = trimmed.length - 1; i >= 0; i--) {
            if (trimmed[i].item.catalogKey === alt.catalogItem!.catalogKey) {
              trimmed.splice(i, 1)
            }
          }
        }
      }

      if (
        verbose ||
        trimmed.length > 0 ||
        (equipped?.score != null && equipped.score < 0) ||
        (equipped && !equipped.catalogItem)
      ) {
        slots.push({
          slot,
          wearLoc,
          layer,
          equipped,
          unmatchedRaw: equipped && !equipped.catalogItem ? equipped.raw : null,
          upgrades: trimmed,
          empty,
        })
      }
    }
  }

  return {
    slots,
    unmatched,
    gearTotal: gearCounted && scoringMode !== 'none' ? gearTotal : null,
    scoringMode,
    propertyLabel,
  }
}
