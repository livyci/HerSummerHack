import { useMemo } from 'react'
import type { Product } from '../types'
import { effectivePrice } from '../types'
import { recommend, type RecReason } from '../lib/recommend'
import { formatCategory } from '../lib/format'

interface RecommendationsProps {
  anchor: Product
  onAdd: (productId: string) => void
  isAdded: (productId: string) => boolean
}

const REASON_CLASS: Record<RecReason, string> = {
  'Pairs well': 'bg-amber/15 text-amber-dark',
  Similar: 'bg-forest-50 text-forest',
  Related: 'bg-slate-bg text-gray-600',
}

export default function Recommendations({
  anchor,
  onAdd,
  isAdded,
}: RecommendationsProps) {
  const recs = useMemo(() => recommend(anchor, 3), [anchor])

  if (recs.length === 0) return null

  return (
    <div className="mt-4 rounded-2xl border border-slate-bg bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900">
        Recommended with this
        <span className="ml-2 text-xs font-normal text-gray-400">
          pairs well on the trail
        </span>
      </h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {recs.map(({ product, reason, explanation }) => {
          const added = isAdded(product.product_id)
          return (
            <div
              key={product.product_id}
              className="flex flex-col rounded-2xl border border-slate-bg bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <span
                className={`self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${REASON_CLASS[reason]}`}
              >
                {reason}
              </span>
              <p className="mt-1.5 text-sm font-semibold leading-tight text-gray-900">
                {product.name}
              </p>
              <p className="text-xs text-gray-500">
                {product.brand} · {formatCategory(product.category)}
              </p>

              {/* Why we recommended this */}
              <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
                {explanation}
              </p>

              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-sm font-bold text-gray-900">
                  CHF {effectivePrice(product)}
                </span>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => onAdd(product.product_id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                    added
                      ? 'bg-forest-50 text-forest cursor-default'
                      : 'bg-forest text-white hover:bg-forest-dark'
                  }`}
                >
                  {added ? '✓ Added' : 'Add'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
