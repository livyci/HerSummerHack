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
}

export default function ProductCard({
  product,
  onAdd,
  added,
  reasons,
  favoriteColors,
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
      className={`flex flex-col rounded-xl bg-white p-4 shadow-sm ${
        discounted ? 'border-2 border-amber bg-amber/5' : 'border border-slate-bg'
      } ${isFavColor ? 'ring-2 ring-amber ring-offset-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-gray-900 leading-tight">
          {product.name}
        </h3>
        <DiscountBadge pct={product.discount_pct} />
      </div>

      <p className="mt-0.5 text-sm text-gray-500">
        {product.brand} · {formatCategory(product.category)}
      </p>
      <p className="text-sm text-gray-500">{product.color}</p>

      <div className="mt-2 flex items-baseline gap-2">
        {discounted ? (
          <>
            <span className="text-sm text-gray-400 line-through">
              CHF {product.price_chf}
            </span>
            <span className="text-lg font-bold text-amber-dark">CHF {final}</span>
          </>
        ) : (
          <span className="text-lg font-bold text-forest">
            CHF {product.price_chf}
          </span>
        )}
      </div>

      {reasons && reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {reasons.map((reason) => (
            <ReasonBadge key={`${reason.kind}-${reason.label}`} reason={reason} />
          ))}
        </div>
      )}

      <p className="mt-2 text-sm text-gray-600">
        📍 Zone {product.zone} ({product.zone_name}), Aisle {product.aisle}
      </p>
      <p className="text-sm text-gray-500">{product.stock_total} in stock</p>

      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
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
    </div>
  )
}
