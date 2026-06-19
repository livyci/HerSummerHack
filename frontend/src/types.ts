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

/** Final price after discount, in CHF. */
export function effectivePrice(p: Product): number {
  return Math.round(p.price_chf * (1 - p.discount_pct / 100) * 100) / 100
}
