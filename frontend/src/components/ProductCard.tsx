import type { Product, RecommendationReason } from '../types'
import { effectivePrice } from '../types'
import { formatCategory } from '../lib/format'
import DiscountBadge from './DiscountBadge'
import ReasonBadge from './ReasonBadge'

interface ProductCardProps {
  product: Product
  onAdd?: (productId: string) => void
  added?: boolean
  reasons?: RecommendationReason[]
  favoriteColors?: string[]
  owned?: boolean
  onMarkBought?: (productId: string) => void
  onUnmarkBought?: (productId: string) => void
}

export default function ProductCard({
  product,
  onAdd,
  added,
  reasons,
  favoriteColors,
  owned,
  onMarkBought,
  onUnmarkBought,
}: ProductCardProps) {
  const discounted = product.discount_pct > 0
  const final = effectivePrice(product)
  // Substring match is intentional: favourite "Teal" also highlights
  // "Teal Stripe", "Teal Dot", etc.
  const isFavColor =
    !!favoriteColors &&
    favoriteColors.some((fc) =>
      product.color.toLowerCase().includes(fc.toLowerCase()),
    )

  return (
    <div
      className={`flex flex-col rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
        discounted ? 'border border-amber' : 'border border-slate-bg'
      } ${isFavColor ? 'ring-2 ring-amber ring-offset-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900 leading-tight">
          {product.name}
        </h3>
        <DiscountBadge pct={product.discount_pct} />
      </div>

      <p className="mt-1 text-sm text-gray-500">
        {product.brand} · {formatCategory(product.category)}
      </p>
      <p className="text-sm text-gray-500">{product.color}</p>

      <div className="mt-3 flex items-baseline gap-2">
        {discounted ? (
          <>
            <span className="text-sm text-gray-400 line-through">
              CHF {product.price_chf}
            </span>
            <span className="text-lg font-bold text-amber-dark">CHF {final}</span>
          </>
        ) : (
          <span className="text-lg font-bold text-gray-900">
            CHF {product.price_chf}
          </span>
        )}
      </div>

      {reasons && reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reasons.map((reason) => (
            <ReasonBadge key={`${reason.kind}-${reason.label}`} reason={reason} />
          ))}
        </div>
      )}

      <p className="mt-3 text-sm text-gray-500">
        📍 Zone {product.zone} ({product.zone_name}), Aisle {product.aisle}
      </p>
      <p className="text-sm text-gray-500">{product.stock_total} in stock</p>

      <p className="mt-3 text-sm text-gray-500 line-clamp-2">
        {product.description}
      </p>

      {onAdd && (
        <button
          type="button"
          disabled={added}
          onClick={() => onAdd(product.product_id)}
          className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
            added
              ? 'bg-forest-50 text-forest cursor-default'
              : 'bg-forest text-white hover:bg-forest-dark'
          }`}
        >
          {added ? '✓ On your list' : 'Add to my list'}
        </button>
      )}
      {owned ? (
        <button
          type="button"
          onClick={() => onUnmarkBought?.(product.product_id)}
          className="mt-2 w-full rounded-xl bg-forest-50 px-4 py-2.5 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
        >
          ✓ Bought — tap to undo
        </button>
      ) : (
        onMarkBought && (
          <button
            type="button"
            onClick={() => onMarkBought(product.product_id)}
            className="mt-2 w-full rounded-xl border border-slate-bg px-4 py-2.5 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
          >
            Mark as bought
          </button>
        )
      )}
    </div>
  )
}
