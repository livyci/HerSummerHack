import products from '../data/products.json'

/**
 * Turn a category slug like "approach-shoes" or "insulated-jacket" into a
 * clean, human label like "Approach Shoes". A few acronyms stay upper-case.
 */
const ACRONYMS = new Set(['3l', 'uv', 'led'])

export function formatCategory(slug) {
  if (!slug) return '—'
  return slug
    .split('-')
    .map((word) =>
      ACRONYMS.has(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

/** Stable, sorted list of category options as { value, label }. */
export function getCategories() {
  const slugs = [...new Set(products.map((p) => p.category))]
  return slugs
    .map((value) => ({ value, label: formatCategory(value) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/** Stable, sorted list of zones as { value, label }. */
export function getZones() {
  const map = new Map()
  for (const p of products) {
    if (!map.has(p.zone)) map.set(p.zone, p.zone_name)
  }
  return [...map.entries()]
    .map(([value, name]) => ({ value, label: `${value} · ${name}`, name }))
    .sort((a, b) => a.value.localeCompare(b.value))
}

/**
 * One row per SKU (size/colour variant). This is the raw inventory the store
 * actually stocks, so every variant is its own line.
 */
export function getInventory() {
  return products.map((p) => ({
    id: p.product_code,
    name: p.name,
    brand: p.brand,
    category: p.category,
    categoryLabel: formatCategory(p.category),
    color: p.color,
    size: p.size,
    price: p.price_chf,
    discount: p.discount_pct,
    material: p.material,
    tags: p.tags ?? [],
    zone: p.zone,
    zoneName: p.zone_name,
    aisle: p.aisle,
    stockFront: p.stock_front,
    stockTotal: p.stock_total,
  }))
}

export function formatChf(value) {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(value)
}
