import productsRaw from '../data/products.json'
import { formatCategory } from './inventory'

/**
 * Cross-sell map: for a given category, which categories pair well with it on
 * a trip. This is the backbone of "recommend with this" — an alpine domain
 * model, not generic "people also bought".
 */
const COMPLEMENTS = {
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

let uniqueCache = null

/** Collapse SKUs (size/colour variants) into one row per product_id. */
export function getUniqueProducts() {
  if (uniqueCache) return uniqueCache
  const map = new Map()
  for (const p of productsRaw) {
    const existing = map.get(p.product_id)
    if (existing) {
      existing.stockTotal += p.stock_total
      existing.stockFront += p.stock_front
      existing.sizes.add(p.size)
      continue
    }
    map.set(p.product_id, {
      id: p.product_id,
      code: p.product_code,
      name: p.name,
      brand: p.brand,
      category: p.category,
      categoryLabel: formatCategory(p.category),
      color: p.color,
      material: p.material,
      price: p.price_chf,
      discount: p.discount_pct,
      tags: p.tags ?? [],
      zone: p.zone,
      zoneName: p.zone_name,
      aisle: p.aisle,
      stockTotal: p.stock_total,
      stockFront: p.stock_front,
      description: p.description,
      sizes: new Set([p.size]),
    })
  }
  uniqueCache = [...map.values()].map((p) => ({ ...p, sizes: [...p.sizes] }))
  return uniqueCache
}

/** Look up the product a scanned barcode (product_code) belongs to. */
export function findByBarcode(code) {
  const sku = productsRaw.find((p) => String(p.product_code) === String(code).trim())
  if (!sku) return null
  return getUniqueProducts().find((p) => p.id === sku.product_id) ?? null
}

/**
 * Rank what to recommend alongside `anchor`. Returns the top items with a
 * `score` and a human `reason` explaining why each was chosen.
 */
export function recommend(anchor, { limit = 6 } = {}) {
  if (!anchor) return []
  const complementCats = new Set(COMPLEMENTS[anchor.category] ?? [])
  const anchorTags = new Set(anchor.tags)

  const scored = []
  for (const p of getUniqueProducts()) {
    if (p.id === anchor.id) continue // never recommend the same product
    if (p.stockTotal <= 0) continue // out of stock can't be picked

    let score = 0
    let reason = 'Related'

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
    if (p.discount > 0) score += W.onSale

    if (score <= 0) continue
    scored.push({ ...p, score, reason, sharedTags })
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      b.discount - a.discount ||
      b.stockTotal - a.stockTotal ||
      a.name.localeCompare(b.name),
  )
  return scored.slice(0, limit)
}
