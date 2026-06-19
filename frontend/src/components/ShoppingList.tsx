import { useAppStore } from '../store/useAppStore'
import { getProductById, getSizesForProduct } from '../lib/products'

export default function ShoppingList() {
  const shoppingList = useAppStore((s) => s.shoppingList)
  const removeFromList = useAppStore((s) => s.removeFromList)
  const toggleBought = useAppStore((s) => s.toggleBought)
  const setSize = useAppStore((s) => s.setSize)

  if (shoppingList.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm border border-slate-bg">
        <p className="text-gray-500">
          Your list is empty — head to Discover to add gear.
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {shoppingList.map((item) => {
        const product = getProductById(item.productId)
        if (!product) return null

        const sizes = getSizesForProduct(item.productId)
        const bought = !!item.bought

        return (
          <li
            key={item.productId}
            className={`flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm border border-slate-bg ${
              bought ? 'opacity-60' : ''
            }`}
          >
            {/* Crossing off marks the item as bought (syncs to the backend). */}
            <button
              type="button"
              onClick={() => toggleBought(item.productId)}
              aria-pressed={bought}
              aria-label={bought ? 'Mark as not bought' : 'Cross off as bought'}
              className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                bought
                  ? 'border-forest bg-forest text-white'
                  : 'border-gray-300 text-transparent hover:border-forest'
              }`}
            >
              ✓
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`font-semibold text-gray-900 ${
                  bought ? 'line-through' : ''
                }`}
              >
                {product.name}
              </p>
              <p className="text-sm text-gray-500">{product.brand}</p>

              {bought ? (
                <p className="mt-1 text-xs font-semibold text-forest">✓ Bought</p>
              ) : (
                sizes.length > 1 && (
                  <select
                    value={item.selectedSize ?? ''}
                    onChange={(e) => setSize(item.productId, e.target.value)}
                    className="mt-2 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-forest focus:outline-none"
                  >
                    {sizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )
              )}

              <p className="mt-2 text-sm text-gray-600">
                Find it in Zone {product.zone}, Aisle {product.aisle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => removeFromList(item.productId)}
              aria-label="Remove from list"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-slate-bg hover:text-amber-dark"
            >
              ✕
            </button>
          </li>
        )
      })}
    </ul>
  )
}
