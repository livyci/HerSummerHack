import rawData from '../data/products.json'
import type {
  Product,
  SearchFilters,
  UserPreferences,
  RecommendationReason,
} from '../types'
import { effectivePrice } from '../types'
import { formatCategory } from './format'

const ALL: Product[] = rawData as Product[]

export function getAllProducts(): Product[] {
  return ALL
}

export function getByBarcode(code: string): Product | undefined {
  const trimmed = code.trim()
  return ALL.find((p) => p.product_code === trimmed)
}

/** All SKUs (sizes/colors) that share a product_id. */
export function getByProductId(id: string): Product[] {
  return ALL.filter((p) => p.product_id === id)
}

/** Single representative SKU per product (one entry per product_id). */
export function getUniqueProducts(): Product[] {
  const seen = new Set<string>()
  const out: Product[] = []
  for (const p of ALL) {
    if (!seen.has(p.product_id)) {
      seen.add(p.product_id)
      out.push(p)
    }
  }
  return out
}

export function getProductById(id: string): Product | undefined {
  return ALL.find((p) => p.product_id === id)
}

export function getDiscounted(): Product[] {
  return getUniqueProducts().filter((p) => p.discount_pct > 0)
}

export function getByCategory(cat: string): Product[] {
  return ALL.filter((p) => p.category === cat)
}

export function getSizesForProduct(id: string): string[] {
  const sizes = getByProductId(id)
    .map((p) => p.size)
    .filter((s): s is string => Boolean(s))
  return Array.from(new Set(sizes))
}

export function getCategories(): string[] {
  return Array.from(new Set(ALL.map((p) => p.category))).sort()
}

/** All distinct product tags in the catalogue, sorted. */
export function getAllTags(): string[] {
  return Array.from(new Set(ALL.flatMap((p) => p.tags)))
    .filter((t): t is string => Boolean(t))
    .sort()
}

/**
 * Filter products by structured SearchFilters. Pure and synchronous (no AI):
 * categories match ANY, tags match ALL, colours match ANY, and price is capped
 * by effectivePrice. When the filters set no price cap, a preference budget is
 * applied as a soft default. Empty filters return the full list.
 */
export function filterProducts(
  products: Product[],
  filters: SearchFilters,
  prefs?: UserPreferences,
): Product[] {
  const priceMax = filters.priceMaxChf ?? prefs?.budgetMaxChf ?? null

  return products.filter((p) => {
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(p.category)
    ) {
      return false
    }
    if (filters.tags.length > 0 && !filters.tags.every((t) => p.tags.includes(t))) {
      return false
    }
    if (filters.colors.length > 0 && !filters.colors.includes(p.color)) {
      return false
    }
    if (priceMax !== null && effectivePrice(p) > priceMax) {
      return false
    }
    return true
  })
}

/**
 * Compute the real reasons a product is being shown — every reason is backed by
 * an actual product field or a saved preference, never fabricated. Returns an
 * empty array when nothing applies.
 */
export function explainRecommendation(
  product: Product,
  filters: SearchFilters,
  prefs?: UserPreferences,
): RecommendationReason[] {
  const reasons: RecommendationReason[] = []

  const matchedTags = filters.tags.filter((t) => product.tags.includes(t))
  if (matchedTags.length > 0) {
    reasons.push({ kind: 'tag-match', label: `Matches: ${matchedTags.join(', ')}` })
  }
  if (product.discount_pct > 0) {
    reasons.push({ kind: 'discount', label: 'On sale' })
  }
  if (prefs?.budgetMaxChf != null && effectivePrice(product) <= prefs.budgetMaxChf) {
    reasons.push({ kind: 'budget', label: 'Matches your budget' })
  }
  if (prefs?.favoriteColors.includes(product.color)) {
    reasons.push({ kind: 'color', label: 'In your favourite colour' })
  }
  if (prefs?.preferredBrands.includes(product.brand)) {
    reasons.push({ kind: 'brand', label: 'A brand you like' })
  }
  if (product.stock_front > 0) {
    reasons.push({ kind: 'in-stock-nearby', label: 'On the shelf now' })
  }
  return reasons
}

/** The verdict for a scanned product against the active Discover filters. */
export interface ScanMatchResult {
  matches: boolean
  /** Populated when `matches` is true — reuses the positive recommendation reasons. */
  reasons: RecommendationReason[]
  /** Populated when `matches` is false — the specific constraint(s) the product failed. */
  mismatches: { label: string; kind: 'category' | 'tag' | 'color' | 'price' }[]
}

/**
 * Compare a scanned product against the active search filters and explain why
 * it does or doesn't fit. Pure and synchronous — no AI. Match status reuses the
 * real `filterProducts` rules so the verdict can never drift from the filtering
 * the shopper sees on Discover.
 *
 * With no active filters there is nothing to compare against, so it returns a
 * neutral `matches: true` with empty reasons and mismatches.
 */
export function explainScanMatch(
  product: Product,
  filters: SearchFilters,
  prefs?: UserPreferences,
): ScanMatchResult {
  const noActiveFilters =
    filters.categories.length === 0 &&
    filters.tags.length === 0 &&
    filters.colors.length === 0 &&
    filters.priceMaxChf === null

  if (noActiveFilters) {
    return { matches: true, reasons: [], mismatches: [] }
  }

  // Reuse the real filter so match status stays consistent by construction.
  const matches = filterProducts([product], filters, prefs).length === 1
  if (matches) {
    return {
      matches: true,
      reasons: explainRecommendation(product, filters, prefs),
      mismatches: [],
    }
  }

  const mismatches: ScanMatchResult['mismatches'] = []

  // Category — filterProducts matches ANY of the requested categories.
  if (
    filters.categories.length > 0 &&
    !filters.categories.includes(product.category)
  ) {
    const wanted = filters.categories.map(formatCategory).join(' or ')
    mismatches.push({
      kind: 'category',
      label: `You're looking for ${wanted}, this is a ${formatCategory(product.category)}`,
    })
  }

  // Tags — filterProducts requires ALL requested tags to be present.
  if (filters.tags.length > 0) {
    const missing = filters.tags.filter((t) => !product.tags.includes(t))
    if (missing.length > 0) {
      mismatches.push({ kind: 'tag', label: `Not marked ${missing.join(', ')}` })
    }
  }

  // Colour — filterProducts matches ANY of the requested colours.
  if (filters.colors.length > 0 && !filters.colors.includes(product.color)) {
    mismatches.push({
      kind: 'color',
      label: `Available in ${product.color}, you wanted ${filters.colors.join(' or ')}`,
    })
  }

  // Price — capped by the explicit filter, else the saved budget (matches filterProducts).
  const priceMax = filters.priceMaxChf ?? prefs?.budgetMaxChf ?? null
  const price = effectivePrice(product)
  if (priceMax !== null && price > priceMax) {
    const over = Math.round((price - priceMax) * 100) / 100
    mismatches.push({
      kind: 'price',
      label: `CHF ${over} over your budget of CHF ${priceMax}`,
    })
  }

  return { matches: false, reasons: [], mismatches }
}

/** All distinct product colours in the catalogue, sorted. */
export function getColors(): string[] {
  return Array.from(new Set(ALL.map((p) => p.color)))
    .filter((c): c is string => Boolean(c))
    .sort()
}

/** All distinct brands in the catalogue, sorted. */
export function getBrands(): string[] {
  return Array.from(new Set(ALL.map((p) => p.brand)))
    .filter((b): b is string => Boolean(b))
    .sort()
}

/** Distinct sizes available within a single category, sorted. */
export function getSizesForCategory(category: string): string[] {
  return Array.from(
    new Set(
      ALL.filter((p) => p.category === category)
        .map((p) => p.size)
        .filter((s): s is string => Boolean(s)),
    ),
  ).sort()
}

export function getZones(): { zone: string; zone_name: string }[] {
  const map = new Map<string, string>()
  for (const p of ALL) {
    if (!map.has(p.zone)) map.set(p.zone, p.zone_name)
  }
  return Array.from(map.entries())
    .map(([zone, zone_name]) => ({ zone, zone_name }))
    .sort((a, b) => a.zone.localeCompare(b.zone))
}
