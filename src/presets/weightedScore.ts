import { getItemPropertyAmount } from '../itemProperties'

/**
 * Sum of (property amount × weight) for each configured property.
 * Missing properties contribute 0 (same idea as Mudlet tcat weighted search).
 */
export function getWeightedScore(
  item: unknown,
  weights: Record<string, number> | null | undefined,
): number {
  if (!weights) {
    return 0
  }
  let score = 0
  for (const [property, weight] of Object.entries(weights)) {
    if (!property || !Number.isFinite(weight) || weight === 0) {
      continue
    }
    const amount = getItemPropertyAmount(item, property)
    if (amount != null) {
      score += amount * weight
    }
  }
  return score
}

/** Compact display for the Score column. */
export function formatWeightedScore(score: number): string {
  if (!Number.isFinite(score)) {
    return ''
  }
  const rounded = Math.round(score * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
}
