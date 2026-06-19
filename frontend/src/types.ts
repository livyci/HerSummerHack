export interface Product {
  product_code: string
  product_id: string
  name: string
  brand: string
  category: string
  color: string
  size: string
  price_chf: number
  discount_pct: number
  weight_g?: number | null
  waterproof_rating_mm?: number | null
  temp_rating_c?: number | null
  material?: string | null
  tags: string[]
  zone: string
  zone_name: string
  aisle: string
  stock_total: number
  stock_front: number
  description: string
}

export interface ShoppingListItem {
  productId: string
  selectedSize?: string
  checked: boolean
  addedAt: number
}

export interface ScannedItem {
  productCode: string
  scannedAt: number
}

/** A past Discover search: the question asked and the products recommended. */
export interface SearchHistoryEntry {
  id: string
  prompt: string
  productIds: string[]
  at: number
}

/** Structured filters parsed from a free-text Discover query. */
export interface SearchFilters {
  categories: string[]
  tags: string[]
  colors: string[]
  priceMaxChf: number | null
  freeText: string
}

/** A shopper's saved preferences (per account), used to personalise Discover. */
export interface UserPreferences {
  sizesByCategory: Record<string, string>
  favoriteColors: string[]
  budgetMinChf: number | null
  budgetMaxChf: number | null
  preferredBrands: string[]
}

/** A real, computed reason a product is being shown ("why am I seeing this"). */
export interface RecommendationReason {
  label: string
  kind: 'budget' | 'color' | 'brand' | 'discount' | 'tag-match' | 'in-stock-nearby'
}

/** A product paired with its computed relevance score, for ranked results. */
export interface ScoredProduct {
  product: Product
  score: number
}

/** Final price after discount, in CHF. */
export function effectivePrice(p: Product): number {
  return Math.round(p.price_chf * (1 - p.discount_pct / 100) * 100) / 100
}
