import rawData from '../data/products.json'
import type {
  Product,
  SearchFilters,
  UserPreferences,
  RecommendationReason,
} from '../types'
import { effectivePrice } from '../types'

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

/** Curated apparel sizes (the catalogue also has shoe / volume sizes). */
export const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

/** All distinct product colours in the catalogue, sorted. */
export function getColors(): string[] {
  return Array.from(new Set(ALL.map((p) => p.color).filter(Boolean))).sort()
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

export function getZones(): { zone: string; zone_name: string }[] {
  const map = new Map<string, string>()
  for (const p of ALL) {
    if (!map.has(p.zone)) map.set(p.zone, p.zone_name)
  }
  return Array.from(map.entries())
    .map(([zone, zone_name]) => ({ zone, zone_name }))
    .sort((a, b) => a.zone.localeCompare(b.zone))
}
