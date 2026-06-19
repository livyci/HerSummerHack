import { useEffect, useState } from 'react'
import type { Product } from '../types'
import { effectivePrice } from '../types'
import { useAppStore } from '../store/useAppStore'
import { compareProducts, MissingApiKeyError } from '../lib/claude'
import DiscountBadge from './DiscountBadge'

interface CompareModalProps {
  scanned: Product
  listItem: Product
  onClose: () => void
}

function PriceLine({ product }: { product: Product }) {
  const discounted = product.discount_pct > 0
  const final = effectivePrice(product)
  return (
    <div className="flex items-baseline gap-2">
      {discounted ? (
        <>
          <span className="text-sm text-gray-400 line-through">
            CHF {product.price_chf}
          </span>
          <span className="text-base font-bold text-amber-dark">
            CHF {final}
          </span>
          <DiscountBadge pct={product.discount_pct} />
        </>
      ) : (
        <span className="text-base font-bold text-forest">
          CHF {product.price_chf}
        </span>
      )}
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-800">{value}</span>
    </div>
  )
}

function ProductColumn({
  title,
  product,
}: {
  title: string
  product: Product
}) {
  return (
    <div className="flex-1 rounded-xl border border-slate-bg bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-forest">
        {title}
      </p>
      <h4 className="mt-1 font-bold text-gray-900">{product.name}</h4>
      <p className="text-sm text-gray-500">{product.brand}</p>
      <div className="mt-2">
        <PriceLine product={product} />
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <Spec label="Color" value={product.color} />
        {product.size && <Spec label="Size" value={product.size} />}
        <Spec
          label="Location"
          value={`Zone ${product.zone}, Aisle ${product.aisle}`}
        />
        <Spec label="Stock" value={`${product.stock_total} in stock`} />
        {product.weight_g != null && (
          <Spec label="Weight" value={`${product.weight_g} g`} />
        )}
        {product.waterproof_rating_mm != null && (
          <Spec
            label="Waterproof"
            value={`${product.waterproof_rating_mm} mm`}
          />
        )}
        {product.temp_rating_c != null && (
          <Spec label="Temp rating" value={`${product.temp_rating_c}°C`} />
        )}
        {product.material != null && (
          <Spec label="Material" value={product.material} />
        )}
      </div>
    </div>
  )
}

export default function CompareModal({
  scanned,
  listItem,
  onClose,
}: CompareModalProps) {
  const addToList = useAppStore((s) => s.addToList)
  const removeFromList = useAppStore((s) => s.removeFromList)

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setResult('')

    compareProducts(scanned, listItem)
      .then((text) => {
        if (active) setResult(text)
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof MissingApiKeyError) {
          setError(err.message)
        } else {
          setError("Couldn't get an AI recommendation right now.")
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [scanned, listItem])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-bg px-4 py-3">
          <h3 className="text-lg font-bold text-gray-900">Compare</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-slate-bg hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <ProductColumn title="On your list" product={listItem} />
            <ProductColumn title="Scanned" product={scanned} />
          </div>

          <div className="mt-4 rounded-xl bg-forest-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-forest">
              AI tip
            </p>
            {loading ? (
              <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-forest border-t-transparent" />
                Thinking…
              </p>
            ) : error ? (
              <p className="mt-1 text-sm text-gray-600">{error}</p>
            ) : (
              <p className="mt-1 whitespace-pre-line text-sm text-gray-800">
                {result}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-bg p-4 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              removeFromList(listItem.product_id)
              addToList(scanned.product_id)
              onClose()
            }}
            className="flex-1 rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white hover:bg-forest-dark"
          >
            Switch to scanned item
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-forest-50 px-4 py-3 text-sm font-semibold text-forest hover:bg-forest-light hover:text-white"
          >
            Keep my list item
          </button>
          <button
            type="button"
            onClick={() => {
              addToList(scanned.product_id)
              onClose()
            }}
            className="flex-1 rounded-xl border-2 border-amber px-4 py-3 text-sm font-semibold text-amber-dark hover:bg-amber/10"
          >
            Add both
          </button>
        </div>
      </div>
    </div>
  )
}
