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

  const [zoneFilter, setZoneFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const zones = useMemo(() => getZones(), [])
  const categories = useMemo(() => getCategories(), [])

  const inventory = useMemo(() => {
    return getUniqueProducts().filter((p) => {
      if (zoneFilter !== 'all' && p.zone !== zoneFilter) return false
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      return true
    })
  }, [zoneFilter, categoryFilter])

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
            <h3 className="text-base font-bold text-gray-900">Store Inventory</h3>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <label className="flex-1 text-sm">
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

              <label className="flex-1 text-sm">
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
            </div>

            <p className="mt-3 text-xs text-gray-400">
              {inventory.length} product{inventory.length === 1 ? '' : 's'}
            </p>

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
