import { useMemo, useState } from 'react'
import type { Product } from '../types'
import { effectivePrice } from '../types'
import {
  getByBarcode,
  getProductById,
  getUniqueProducts,
  getZones,
  getCategories,
} from '../lib/products'
import { useAppStore } from '../store/useAppStore'
import ScanInput from '../components/ScanInput'
import ShoppingList from '../components/ShoppingList'
import ProductCard from '../components/ProductCard'
import CompareModal from '../components/CompareModal'
import DiscountBadge from '../components/DiscountBadge'

type MobileTab = 'list' | 'scanner'

type SortKey =
  | 'featured'
  | 'price-asc'
  | 'price-desc'
  | 'discount'
  | 'name-asc'
  | 'name-desc'
  | 'stock-desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Featured (deals first)' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'discount', label: 'Biggest discount' },
  { value: 'name-asc', label: 'Name: A–Z' },
  { value: 'name-desc', label: 'Name: Z–A' },
  { value: 'stock-desc', label: 'Most in stock' },
]

interface CompareTarget {
  scanned: Product
  listItem: Product
}

export default function ShoppingPage() {
  const addToList = useAppStore((s) => s.addToList)
  const addScan = useAppStore((s) => s.addScan)
  const shoppingList = useAppStore((s) => s.shoppingList)

  const [tab, setTab] = useState<MobileTab>('list')
  const [scanned, setScanned] = useState<Product | null>(null)
  const [notFound, setNotFound] = useState<string | null>(null)
  const [compareTarget, setCompareTarget] = useState<CompareTarget | null>(null)

  const [search, setSearch] = useState('')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [onSaleOnly, setOnSaleOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('featured')

  const zones = useMemo(() => getZones(), [])
  const categories = useMemo(() => getCategories(), [])

  const filtersActive =
    search.trim() !== '' ||
    zoneFilter !== 'all' ||
    categoryFilter !== 'all' ||
    onSaleOnly ||
    sortKey !== 'featured'

  function resetFilters() {
    setSearch('')
    setZoneFilter('all')
    setCategoryFilter('all')
    setOnSaleOnly(false)
    setSortKey('featured')
  }

  const inventory = useMemo(() => {
    const q = search.trim().toLowerCase()

    const filtered = getUniqueProducts().filter((p) => {
      if (zoneFilter !== 'all' && p.zone !== zoneFilter) return false
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (onSaleOnly && p.discount_pct <= 0) return false
      if (q) {
        const haystack =
          `${p.name} ${p.brand} ${p.category} ${p.color} ${p.tags.join(' ')}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

    const byName = (a: Product, b: Product) => a.name.localeCompare(b.name)
    const sorted = [...filtered]
    switch (sortKey) {
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
      case 'name-desc':
        sorted.sort((a, b) => byName(b, a))
        break
      case 'featured':
      default:
        // On-sale items first (biggest discount first), then the rest by name.
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

  function handleScan(code: string) {
    addScan(code)
    setNotFound(null)
    setScanned(null)

    const product = getByBarcode(code)
    if (!product) {
      setNotFound(code)
      return
    }

    setScanned(product)

    // Find a product on the list that shares the scanned product's category.
    const match = shoppingList
      .map((item) => getProductById(item.productId))
      .find(
        (p): p is Product =>
          p !== undefined &&
          p.category === product.category &&
          p.product_id !== product.product_id,
      )

    if (match) {
      setCompareTarget({ scanned: product, listItem: match })
    }
  }

  const isAdded = (productId: string) =>
    shoppingList.some((i) => i.productId === productId)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
        In-store assistant
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Check off your list, scan items, and compare on the spot.
      </p>

      {/* Mobile tabs */}
      <div className="mt-6 flex gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setTab('list')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'list'
              ? 'bg-forest text-white'
              : 'bg-white text-gray-600 shadow-sm'
          }`}
        >
          My List
        </button>
        <button
          type="button"
          onClick={() => setTab('scanner')}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            tab === 'scanner'
              ? 'bg-forest text-white'
              : 'bg-white text-gray-600 shadow-sm'
          }`}
        >
          Scanner
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* LEFT — My List */}
        <section className={tab === 'list' ? 'block' : 'hidden lg:block'}>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-gray-900">My List</h2>
            <span className="text-sm text-gray-500">
              {shoppingList.length} item{shoppingList.length === 1 ? '' : 's'}
            </span>
          </div>
          <ShoppingList />
        </section>

        {/* RIGHT — Scanner + Inventory */}
        <section className={tab === 'scanner' ? 'block' : 'hidden lg:block'}>
          <h2 className="mb-3 text-lg font-bold text-gray-900">
            Scanner &amp; Inventory
          </h2>

          <ScanInput onScan={handleScan} />

          {/* Not found */}
          {notFound && (
            <div className="mt-4 rounded-xl border border-amber/40 bg-amber/10 p-4 text-sm text-amber-dark">
              <span className="font-semibold">Product not in store inventory</span>
              <span className="block text-amber-dark/80">
                Scanned code: {notFound}
              </span>
            </div>
          )}

          {/* Scanned product detail (shown when no compare modal triggered) */}
          {scanned && !compareTarget && (
            <div className="mt-4 rounded-xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {scanned.name}
                </h3>
                <DiscountBadge pct={scanned.discount_pct} />
              </div>
              <p className="mt-0.5 text-sm text-gray-500">
                {scanned.brand} · {scanned.category}
              </p>

              <div className="mt-2 flex items-baseline gap-2">
                {scanned.discount_pct > 0 ? (
                  <>
                    <span className="text-sm text-gray-400 line-through">
                      CHF {scanned.price_chf}
                    </span>
                    <span className="text-xl font-bold text-amber-dark">
                      CHF {effectivePrice(scanned)}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-bold text-forest">
                    CHF {scanned.price_chf}
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-gray-600">
                📍 Zone {scanned.zone} ({scanned.zone_name}), Aisle {scanned.aisle}
              </p>
              <p className="text-sm text-gray-500">
                {scanned.stock_total} in stock ({scanned.stock_front} on the floor)
              </p>
              <p className="mt-2 text-sm text-gray-600">{scanned.description}</p>

              <button
                type="button"
                disabled={isAdded(scanned.product_id)}
                onClick={() => addToList(scanned.product_id)}
                className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                  isAdded(scanned.product_id)
                    ? 'bg-forest-50 text-forest cursor-default'
                    : 'bg-forest text-white hover:bg-forest-dark'
                }`}
              >
                {isAdded(scanned.product_id) ? '✓ On your list' : 'Add to my list'}
              </button>
            </div>
          )}

          {/* Inventory browser */}
          <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Store Inventory</h3>
              {filtersActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-semibold text-forest hover:underline"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Search */}
            <div className="mt-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, brand, color, or tag…"
                aria-label="Search inventory"
                className="w-full rounded-xl border border-slate-bg bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
              />
            </div>

            {/* Filters + sort */}
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
                <span className="mb-1 block font-medium text-gray-600">
                  Category
                </span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-bg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
                >
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
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

            {/* On-sale toggle + result count */}
            <div className="mt-3 flex items-center justify-between">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={onSaleOnly}
                  onChange={(e) => setOnSaleOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-bg accent-forest"
                />
                On sale only
              </label>
              <p className="text-xs text-gray-400">
                {inventory.length} product{inventory.length === 1 ? '' : 's'}
              </p>
            </div>

            {inventory.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No products match these filters.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
        </section>
      </div>

      {compareTarget && (
        <CompareModal
          scanned={compareTarget.scanned}
          listItem={compareTarget.listItem}
          onClose={() => setCompareTarget(null)}
        />
      )}
    </div>
  )
}
