import { useState } from 'react'
import type { Product } from '../types'
import { effectivePrice } from '../types'
import {
  getByBarcode,
  getProductById,
  explainScanMatch,
  type ScanMatchResult,
} from '../lib/products'
import { formatCategory } from '../lib/format'
import { useAppStore } from '../store/useAppStore'
import { useSearchStore, hasActiveFilters } from '../store/useSearchStore'
import { usePreferencesStore } from '../store/usePreferencesStore'
import ScanInput from '../components/ScanInput'
import ShoppingList from '../components/ShoppingList'
import Recommendations from '../components/Recommendations'
import CompareModal from '../components/CompareModal'
import DiscountBadge from '../components/DiscountBadge'
import ReasonBadge from '../components/ReasonBadge'

type MobileTab = 'list' | 'scanner'

interface CompareTarget {
  scanned: Product
  listItem: Product
}

export default function ShoppingPage() {
  const addToList = useAppStore((s) => s.addToList)
  const addScan = useAppStore((s) => s.addScan)
  const shoppingList = useAppStore((s) => s.shoppingList)
  const filters = useSearchStore((s) => s.filters)
  const preferences = usePreferencesStore((s) => s.preferences)

  const [tab, setTab] = useState<MobileTab>('list')
  const [scanned, setScanned] = useState<Product | null>(null)
  const [notFound, setNotFound] = useState<string | null>(null)
  const [compareTarget, setCompareTarget] = useState<CompareTarget | null>(null)

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

  // Does the scanned item fit the search the shopper set on Discover? Pure,
  // recomputed on render so it always reflects the current filters.
  const scanMatch: ScanMatchResult | null = scanned
    ? explainScanMatch(scanned, filters, preferences)
    : null

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

        {/* RIGHT — Scanner + Recommendations */}
        <section className={tab === 'scanner' ? 'block' : 'hidden lg:block'}>
          <h2 className="mb-3 text-lg font-bold text-gray-900">
            Scan &amp; Recommend
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

          {/* Scanned product detail + recommendations (no compare modal triggered) */}
          {scanned && !compareTarget && (
            <>
              <div className="mt-4 rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    {scanned.name}
                  </h3>
                  <DiscountBadge pct={scanned.discount_pct} />
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
                  {scanned.brand} · {formatCategory(scanned.category)}
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

              {scanMatch && (
                <ScanMatchCallout
                  result={scanMatch}
                  hasFilters={hasActiveFilters(filters)}
                />
              )}

              <Recommendations
                anchor={scanned}
                onAdd={addToList}
                isAdded={isAdded}
              />
            </>
          )}

          {!scanned && !notFound && (
            <p className="mt-4 text-sm text-gray-500">
              Scan or type a barcode to see product details and what pairs well
              with it. Browse everything on the{' '}
              <span className="font-semibold text-forest">Inventory</span> tab.
            </p>
          )}
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

interface ScanMatchCalloutProps {
  result: ScanMatchResult
  hasFilters: boolean
}

/**
 * Explains how a scanned product relates to the active Discover search:
 * a neutral note when there's no search, positive reason badges on a match,
 * or a muted amber callout listing the specific reasons it doesn't fit.
 */
function ScanMatchCallout({ result, hasFilters }: ScanMatchCalloutProps) {
  if (!hasFilters) {
    return (
      <div className="mt-3 rounded-xl border border-slate-bg bg-slate-bg/40 p-3 text-sm text-gray-500">
        No active search to compare against — search on{' '}
        <span className="font-semibold text-forest">Discover</span> to see how a
        scanned item fits what you're looking for.
      </div>
    )
  }

  if (result.matches) {
    return (
      <div className="mt-3 rounded-xl border border-forest-light/40 bg-forest-50 p-3">
        <p className="text-sm font-semibold text-forest">
          ✓ Matches what you searched for
        </p>
        {result.reasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.reasons.map((r) => (
              <ReasonBadge key={`${r.kind}-${r.label}`} reason={r} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-amber/40 bg-amber/10 p-3">
      <p className="text-sm font-semibold text-amber-dark">
        Not quite what you searched for
      </p>
      <ul className="mt-1.5 space-y-1">
        {result.mismatches.map((m) => (
          <li
            key={`${m.kind}-${m.label}`}
            className="flex items-start gap-1.5 text-sm text-amber-dark/90"
          >
            <span aria-hidden>•</span>
            <span>{m.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
