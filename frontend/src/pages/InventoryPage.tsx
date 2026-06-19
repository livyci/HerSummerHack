import { useMemo, useState } from 'react'
import type { Product } from '../types'
import { effectivePrice } from '../types'
import { getUniqueProducts, getZones, getCategories } from '../lib/products'
import { formatCategory } from '../lib/format'
import { useAppStore } from '../store/useAppStore'
import ProductCard from '../components/ProductCard'

type SortKey =
  | 'category'
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'discount'
  | 'name-asc'
  | 'stock-desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'category', label: 'Category: A–Z' },
  { value: 'featured', label: 'Featured (deals first)' },
  { value: 'name-asc', label: 'Name: A–Z' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'discount', label: 'Biggest discount' },
  { value: 'stock-desc', label: 'Most in stock' },
]

export default function InventoryPage() {
  const addToList = useAppStore((s) => s.addToList)
  const shoppingList = useAppStore((s) => s.shoppingList)

  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [onSaleOnly, setOnSaleOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('category')

  const zones = useMemo(() => getZones(), [])
  // Categories as { value, label } sorted by the clean, human label.
  const categories = useMemo(
    () =>
      getCategories()
        .map((value) => ({ value, label: formatCategory(value) }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [],
  )

  const filtersActive =
    search.trim() !== '' ||
    zoneFilter !== 'all' ||
    categoryFilter !== 'all' ||
    onSaleOnly ||
    sortKey !== 'category'

  function resetFilters() {
    setSearch('')
    setZoneFilter('all')
    setCategoryFilter('all')
    setOnSaleOnly(false)
    setSortKey('category')
  }

  const inventory = useMemo(() => {
    const q = search.trim().toLowerCase()

    const filtered = getUniqueProducts().filter((p) => {
      if (zoneFilter !== 'all' && p.zone !== zoneFilter) return false
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (onSaleOnly && p.discount_pct <= 0) return false
      if (q) {
        // Zones are intentionally NOT searchable — they're a filter only.
        const haystack =
          `${p.name} ${p.brand} ${formatCategory(p.category)} ${p.color} ${p.tags.join(' ')}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

    const byName = (a: Product, b: Product) => a.name.localeCompare(b.name)
    const sorted = [...filtered]
    switch (sortKey) {
      case 'category':
        sorted.sort(
          (a, b) =>
            formatCategory(a.category).localeCompare(formatCategory(b.category)) ||
            byName(a, b),
        )
        break
      case 'price-asc':
        sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b) || byName(a, b))
        break
      case 'price-desc':
        sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a) || byName(a, b))
        break
      case 'discount':
        sorted.sort((a, b) => b.discount_pct - a.discount_pct || byName(a, b))
        break
      case 'stock-desc':
        sorted.sort((a, b) => b.stock_total - a.stock_total || byName(a, b))
        break
      case 'name-asc':
        sorted.sort(byName)
        break
      case 'featured':
      default:
        sorted.sort(
          (a, b) =>
            Number(b.discount_pct > 0) - Number(a.discount_pct > 0) ||
            b.discount_pct - a.discount_pct ||
            byName(a, b),
        )
        break
    }
    return sorted
  }, [search, zoneFilter, categoryFilter, onSaleOnly, sortKey])

  const isAdded = (productId: string) =>
    shoppingList.some((i) => i.productId === productId)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Store Inventory
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse the full catalogue — filter by zone or category, sort any way
            you like.
          </p>
        </div>
        <p className="text-sm text-gray-400">
          {inventory.length} product{inventory.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Controls */}
      <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, color, or tag…"
            aria-label="Search inventory"
            className="w-full rounded-xl border border-slate-bg bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
          />
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-3 shrink-0 text-xs font-semibold text-forest hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-600">Zone</span>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-bg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
            >
              <option value="all">All zones</option>
              {zones.map((z) => (
                <option key={z.zone} value={z.zone}>
                  {z.zone} — {z.zone_name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-600">Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-bg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-600">Sort by</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="w-full rounded-xl border border-slate-bg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={onSaleOnly}
              onChange={(e) => setOnSaleOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-bg accent-forest"
            />
            On sale only
          </label>
        </div>
      </div>

      {/* Grid */}
      {inventory.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">
          No products match these filters.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {inventory.map((product) => (
            <ProductCard
              key={product.product_id}
              product={product}
              onAdd={addToList}
              added={isAdded(product.product_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
