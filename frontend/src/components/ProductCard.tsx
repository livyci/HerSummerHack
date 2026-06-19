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
      className={`flex flex-col rounded-2xl bg-card p-4 shadow-sm ${
        discounted ? 'border-2 border-amber bg-amber/5' : 'border border-border'
      } ${isFavColor ? 'ring-2 ring-amber ring-offset-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-foreground leading-tight">
          {product.name}
        </h3>
        <DiscountBadge pct={product.discount_pct} />
      </div>

      <p className="mt-0.5 text-sm text-muted-foreground">
        {product.brand} · {formatCategory(product.category)}
      </p>
      <p className="text-sm text-muted-foreground">{product.color}</p>

      <div className="mt-2 flex items-baseline gap-2">
        {discounted ? (
          <>
            <span className="text-sm text-muted-foreground line-through">
              CHF {product.price_chf}
            </span>
            <span className="text-lg font-bold text-amber-dark">CHF {final}</span>
          </>
        ) : (
          <span className="text-lg font-bold text-foreground">
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

      <p className="mt-2 text-sm text-muted-foreground">
        📍 Zone {product.zone} ({product.zone_name}), Aisle {product.aisle}
      </p>
      <p className="text-sm text-muted-foreground">{product.stock_total} in stock</p>

      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
        {product.description}
      </p>

      {onAdd && (
        <button
          type="button"
          disabled={added}
          onClick={() => onAdd(product.product_id)}
          className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
            added
              ? 'bg-muted text-muted-foreground cursor-default'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {added ? '✓ On your list' : 'Add to my list'}
        </button>
      )}
      {owned ? (
        <button
          type="button"
          onClick={() => onUnmarkBought?.(product.product_id)}
          className="mt-2 w-full rounded-xl bg-muted px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          ✓ Bought — tap to undo
        </button>
      ) : (
        onMarkBought && (
          <button
            type="button"
            onClick={() => onMarkBought(product.product_id)}
            className="mt-2 w-full rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Mark as bought
          </button>
        )
      )}
    </div>
  )
}
