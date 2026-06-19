import rawData from '../data/products.json'
import type { Product } from '../types'

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

export function getZones(): { zone: string; zone_name: string }[] {
  const map = new Map<string, string>()
  for (const p of ALL) {
    if (!map.has(p.zone)) map.set(p.zone, p.zone_name)
  }
  return Array.from(map.entries())
    .map(([zone, zone_name]) => ({ zone, zone_name }))
    .sort((a, b) => a.zone.localeCompare(b.zone))
}

/** Curated apparel sizes for the profile picker (catalog also has shoe/volume sizes). */
export const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

/** All distinct product colours present in the catalog, sorted. */
export function getColors(): string[] {
  return Array.from(new Set(ALL.map((p) => p.color).filter(Boolean))).sort()
}
