import { useAppStore } from '../store/useAppStore'
import { getProductById, getSizesForProduct } from '../lib/products'

export default function ShoppingList() {
  const shoppingList = useAppStore((s) => s.shoppingList)
  const removeFromList = useAppStore((s) => s.removeFromList)
  const toggleChecked = useAppStore((s) => s.toggleChecked)
  const setSize = useAppStore((s) => s.setSize)
  const token = useAppStore((s) => s.token)
  const purchases = useAppStore((s) => s.purchases)
  const markAsBought = useAppStore((s) => s.markAsBought)
  const unmarkBought = useAppStore((s) => s.unmarkBought)

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

        return (
          <li
            key={item.productId}
            className={`flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm border border-slate-bg ${
              item.checked ? 'opacity-60' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => toggleChecked(item.productId)}
              aria-pressed={item.checked}
              aria-label={item.checked ? 'Uncheck item' : 'Check off item'}
              className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                item.checked
                  ? 'border-forest bg-forest text-white'
                  : 'border-gray-300 text-transparent hover:border-forest'
              }`}
            >
              ✓
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`font-semibold text-gray-900 ${
                  item.checked ? 'line-through' : ''
                }`}
              >
                {product.name}
              </p>
              <p className="text-sm text-gray-500">{product.brand}</p>

              {sizes.length > 1 && (
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
              )}

              <p className="mt-2 text-sm text-gray-600">
                Find it in Zone {product.zone}, Aisle {product.aisle}
              </p>
              {token &&
                (purchases.includes(item.productId) ? (
                  <button
                    type="button"
                    onClick={() => unmarkBought(item.productId)}
                    className="mt-2 rounded-lg bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
                  >
                    ✓ Bought — undo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => markAsBought(item.productId)}
                    className="mt-2 rounded-lg border border-forest px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
                  >
                    Mark as bought
                  </button>
                ))}
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
