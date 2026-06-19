import { describe, it, expect } from 'vitest'
import { recommendByFilters } from './recommend'
import { doesMatchWishlist } from './products'
import type {
  Product,
  SearchFilters,
  UserPreferences,
  ShoppingListItem,
} from '../types'

function product(over: Partial<Product>): Product {
  return {
    product_code: '0',
    product_id: 'P?',
    name: 'Item',
    brand: 'BrandA',
    category: 'tent',
    color: 'Teal',
    size: 'one-size',
    price_chf: 100,
    discount_pct: 0,
    tags: [],
    zone: 'A',
    zone_name: 'Zone A',
    aisle: 'A1',
    stock_total: 5,
    stock_front: 2,
    description: '',
    ...over,
  }
}

const filters = (over: Partial<SearchFilters>): SearchFilters => ({
  categories: [],
  tags: [],
  colors: [],
  priceMaxChf: null,
  freeText: '',
  ...over,
})

describe('recommendByFilters', () => {
  const waterproofLight = product({
    product_id: 'P1',
    tags: ['waterproof', 'lightweight'],
  })
  const waterproofOnly = product({ product_id: 'P2', tags: ['waterproof'] })
  const lightOnly = product({ product_id: 'P3', tags: ['lightweight'] })
  const unrelated = product({ product_id: 'P4', tags: ['casual'] })
  const all = [waterproofLight, waterproofOnly, lightOnly, unrelated]

  it('loosely matches partial tag overlap (not all-or-nothing) and ranks by score', () => {
    const ranked = recommendByFilters(all, filters({ tags: ['waterproof', 'lightweight'] }))
    const ids = ranked.map((r) => r.product.product_id)
    // The unrelated item has no overlap and is excluded.
    expect(ids).not.toContain('P4')
    // Both single-tag items still appear (partial match) — looser than AND.
    expect(ids).toContain('P2')
    expect(ids).toContain('P3')
    // The two-tag item scores highest and sorts first.
    expect(ids[0]).toBe('P1')
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score)
  })

  it('returns everything when there is no active query', () => {
    expect(recommendByFilters(all, filters({})).length).toBe(all.length)
  })

  it('treats price as a hard cap via effective (discounted) price', () => {
    const cheapOnSale = product({
      product_id: 'P5',
      tags: ['waterproof'],
      price_chf: 240,
      discount_pct: 60, // effective 96
    })
    const pricey = product({ product_id: 'P6', tags: ['waterproof'], price_chf: 200 })
    const ranked = recommendByFilters(
      [cheapOnSale, pricey],
      filters({ tags: ['waterproof'], priceMaxChf: 100 }),
    )
    const ids = ranked.map((r) => r.product.product_id)
    expect(ids).toContain('P5') // 96 <= 100
    expect(ids).not.toContain('P6') // 200 > 100
  })

  it('uses preferences only to re-rank, never to pass the threshold', () => {
    const prefs: UserPreferences = {
      sizesByCategory: {},
      favoriteColors: ['Teal'],
      budgetMinChf: null,
      budgetMaxChf: null,
      preferredBrands: ['BrandA'],
    }
    // unrelated has no tag overlap; preference bonuses must not surface it.
    const ranked = recommendByFilters(all, filters({ tags: ['waterproof'] }), prefs)
    expect(ranked.map((r) => r.product.product_id)).not.toContain('P4')
  })
})

describe('doesMatchWishlist', () => {
  const item = (productId: string): ShoppingListItem => ({
    productId,
    checked: false,
    addedAt: 0,
  })
  const scanned = product({ product_id: 'P1' })

  it('matches by product_id', () => {
    expect(doesMatchWishlist(scanned, [item('P9'), item('P1')])).toBe(true)
    expect(doesMatchWishlist(scanned, [item('P9')])).toBe(false)
  })

  it('returns false (no crash) for empty / undefined / null wishlists', () => {
    expect(doesMatchWishlist(scanned, [])).toBe(false)
    expect(doesMatchWishlist(scanned, undefined)).toBe(false)
    expect(doesMatchWishlist(scanned, null)).toBe(false)
  })
})
