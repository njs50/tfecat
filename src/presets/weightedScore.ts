import {
  getItemPropertyAmount,
  getItemPropertyAmountParts,
  type ItemPropertyAmountPart,
} from '../itemProperties'
import type { CharacterStats } from './types'

export type WeightedScoreLine = {
  property: string
  amount: number
  weight: number
  contribution: number
  /** Synthetic/composite amount parts (empty for plain properties). */
  parts: ItemPropertyAmountPart[]
}

/**
 * Sum of (property amount × weight) for each configured property.
 * Missing properties contribute 0 (same idea as Mudlet tcat weighted search).
 * Softcaps use the active character profile stats when provided.
 */
export function getWeightedScore(
  item: unknown,
  weights: Record<string, number> | null | undefined,
  characterStats?: CharacterStats | null,
): number {
  return getWeightedScoreBreakdown(item, weights, characterStats).total
}

/** Per-property contributions; skips missing / zero amounts (Mudlet tcat debug). */
export function getWeightedScoreBreakdown(
  item: unknown,
  weights: Record<string, number> | null | undefined,
  characterStats?: CharacterStats | null,
): { lines: WeightedScoreLine[]; total: number } {
  const lines: WeightedScoreLine[] = []
  if (!weights) {
    return { lines, total: 0 }
  }
  let total = 0
  for (const [property, weight] of Object.entries(weights)) {
    if (!property || !Number.isFinite(weight)) {
      continue
    }
    const amount = getItemPropertyAmount(item, property, characterStats)
    // Mudlet: `if amt ~= 0` — skip absent / zero properties.
    if (amount == null || amount === 0) {
      continue
    }
    const contribution = amount * weight
    const merged = new Map<string, number>()
    for (const part of getItemPropertyAmountParts(item, property, characterStats)) {
      if (!part.amount) continue
      merged.set(part.label, (merged.get(part.label) ?? 0) + part.amount)
    }
    const parts = [...merged.entries()]
      .map(([label, partAmount]) => ({ label, amount: partAmount }))
      // Nested composite sources: highest amount first.
      .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label))
    lines.push({ property, amount, weight, contribution, parts })
    total += contribution
  }
  // Weight Score lines: highest contribution first.
  lines.sort(
    (a, b) => b.contribution - a.contribution || a.property.localeCompare(b.property),
  )
  return { lines, total }
}

/** Compact display for the Score column. */
export function formatWeightedScore(score: number): string {
  if (!Number.isFinite(score)) {
    return ''
  }
  const rounded = Math.round(score * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
}

/** `14 fire + 7 wisdom` / `15 deflection + 5 global armor` (parts pre-sorted). */
function formatAmountParts(parts: ItemPropertyAmountPart[]): string {
  return parts
    .map((part) => `${formatWeightedScore(part.amount)} ${part.label}`)
    .join(' + ')
}

/**
 * Item-page weight block (appended into the same `<pre>` as the ident).
 * Lines are sorted by contribution (desc). Synthetic props append an amount
 * breakdown, e.g.:
 * ```
 *  Weight Score:
 *      Hit_points: 280
 *          resist: 147 (14 fire + 7 wisdom)
 *      deflection: 200 (15 deflection + 5 global armor)
 *   weighted score: 627
 * ```
 */
export function formatWeightSummary(
  item: unknown,
  weights: Record<string, number> | null | undefined,
  characterStats?: CharacterStats | null,
): string {
  const { lines, total } = getWeightedScoreBreakdown(item, weights, characterStats)
  const totalLabel = 'weighted score'
  const labels = [...lines.map((line) => line.property), totalLabel]
  // Keep a little left margin on the longest label (matches Nick's screenshot pad).
  const labelWidth = Math.max(16, ...labels.map((l) => l.length + 2))
  const values = [
    ...lines.map((line) => formatWeightedScore(line.contribution)),
    formatWeightedScore(total),
  ]
  const valueWidth = Math.max(1, ...values.map((v) => v.length))
  const formatLine = (label: string, value: string, suffix = '') =>
    `${label.padStart(labelWidth)}: ${value.padStart(valueWidth)}${suffix}`
  const body = lines.map((line, i) => {
    const suffix =
      line.parts.length > 1 ? ` (${formatAmountParts(line.parts)})` : ''
    return formatLine(line.property, values[i], suffix)
  })
  const totalLine = formatLine(totalLabel, values[values.length - 1])
  return [' Weight Score:', ...body, totalLine].join('\n')
}
