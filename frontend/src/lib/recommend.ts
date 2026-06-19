import type { Product } from '../types'
import { getUniqueProducts } from './products'
import { formatCategory } from './format'

/**
 * Cross-sell map: for a given category, which categories pair well with it on
 * a trip. This is the backbone of "recommend with this" — an alpine domain
 * model, not generic "people also bought".
 */
const COMPLEMENTS: Record<string, string[]> = {
  tent: ['sleeping-bag', 'sleeping-mat', 'tarp', 'headlamp', 'stove'],
  tarp: ['tent', 'sleeping-mat', 'sleeping-bag'],
  'sleeping-bag': ['sleeping-mat', 'tent', 'headlamp'],
  'sleeping-mat': ['sleeping-bag', 'tent'],
  stove: ['water-bottle', 'tent', 'headlamp'],
  headlamp: ['tent', 'sleeping-bag', 'stove'],
  'water-bottle': ['backpack', 'stove', 'trekking-poles'],
  backpack: ['water-bottle', 'trekking-poles', 'rain-jacket', 'headlamp'],
  boots: ['socks', 'trekking-poles', 'trousers'],
  'approach-shoes': ['socks', 'trekking-poles'],
  'trail-shoes': ['socks', 'trekking-poles'],
  socks: ['boots', 'trail-shoes', 'approach-shoes'],
  'trekking-poles': ['boots', 'backpack'],
  hardshell: ['base-layer', 'fleece', 'gloves', 'hat'],
  'rain-jacket': ['base-layer', 'fleece', 'trousers', 'backpack'],
  'insulated-jacket': ['base-layer', 'fleece', 'gloves', 'hat'],
  fleece: ['base-layer', 'hardshell', 'insulated-jacket'],
  'base-layer': ['fleece', 'insulated-jacket', 'socks'],
  gloves: ['hat', 'hardshell', 'insulated-jacket'],
  hat: ['gloves', 'insulated-jacket', 'base-layer'],
  trousers: ['base-layer', 'boots', 'rain-jacket'],
}

// Scoring weights — tweak these to change what gets recommended.
const W = {
  complement: 50, // pairs well on a trip (cross-sell)
  similar: 22, // same category — an alternative
  sharedTag: 8, // per overlapping tag (waterproof, 3-season, …)
  sameZone: 6, // sits in the same store zone — easy to grab together
  sameBrand: 5, // brand affinity
  onSale: 4, // nudge discounted stock
}

export type RecReason = 'Pairs well' | 'Similar' | 'Related'

export interface Recommendation {
  product: Product
  score: number
  reason: RecReason
  sharedTags: string[]
  /** One short sentence explaining why this was recommended. */
  explanation: string
}

/** Build a brief, human "why we picked this" sentence from the scoring signals. */
function explain(
  anchor: Product,
  p: Product,
  reason: RecReason,
  sharedTags: string[],
): string {
  const parts: string[] = []

  if (reason === 'Pairs well') {
    parts.push(`Goes with your ${formatCategory(anchor.category)}`)
  } else if (reason === 'Similar') {
    parts.push(`Similar to your ${formatCategory(anchor.category)}`)
  } else {
    parts.push('Related pick')
  }

  // Add the single strongest supporting signal, if any.
  if (sharedTags.length > 0) {
    parts.push(`also ${sharedTags.slice(0, 2).join(' & ')}`)
  } else if (p.brand === anchor.brand) {
    parts.push(`same brand (${p.brand})`)
  } else if (p.zone === anchor.zone) {
    parts.push(`same zone (${anchor.zone})`)
  }

  if (p.discount_pct > 0) parts.push(`${p.discount_pct}% off`)

  return parts.join(' · ')
}

/**
 * Rank what to recommend alongside `anchor`. Returns the top items with a
 * `score` and a human `reason` explaining why each was chosen.
 */
export function recommend(
  anchor: Product | null,
  limit = 3,
): Recommendation[] {
  if (!anchor) return []
  const complementCats = new Set(COMPLEMENTS[anchor.category] ?? [])
  const anchorTags = new Set(anchor.tags)

  const scored: Recommendation[] = []
  for (const p of getUniqueProducts()) {
    if (p.product_id === anchor.product_id) continue // never the same product
    if (p.stock_total <= 0) continue // out of stock can't be picked

    let score = 0
    let reason: RecReason = 'Related'

    if (complementCats.has(p.category)) {
      score += W.complement
      reason = 'Pairs well'
    } else if (p.category === anchor.category) {
      score += W.similar
      reason = 'Similar'
    }

    const sharedTags = p.tags.filter((t) => anchorTags.has(t))
    score += sharedTags.length * W.sharedTag
    if (p.zone === anchor.zone) score += W.sameZone
    if (p.brand === anchor.brand) score += W.sameBrand
    if (p.discount_pct > 0) score += W.onSale

    if (score <= 0) continue
    scored.push({
      product: p,
      score,
      reason,
      sharedTags,
      explanation: explain(anchor, p, reason, sharedTags),
    })
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.product.discount_pct - a.product.discount_pct ||
      b.product.stock_total - a.product.stock_total ||
      a.product.name.localeCompare(b.product.name),
  )
  return scored.slice(0, limit)
}
