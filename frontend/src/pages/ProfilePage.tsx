import { useCurrentUser, useUserStore } from '../store/useUserStore'
import {
  getCategories,
  getColors,
  getBrands,
  getSizesForCategory,
} from '../lib/products'
import { formatCategory } from '../lib/format'

// Only categories with a real size choice get a picker (skips one-size items).
const SIZED_CATEGORIES = getCategories().filter(
  (c) => getSizesForCategory(c).length > 1,
)
const COLORS = getColors()
const BRANDS = getBrands()

/** Parse a numeric text field into a finite number, or null when blank/invalid. */
function parseAmount(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export default function ProfilePage() {
  const current = useCurrentUser()
  const updatePrefs = useUserStore((s) => s.updatePrefs)
  const prefs = current.prefs

  function setSizeFor(category: string, size: string) {
    const next = { ...prefs.sizesByCategory }
    if (size) next[category] = size
    else delete next[category]
    updatePrefs({ sizesByCategory: next })
  }

  function toggleColor(color: string) {
    const next = prefs.favoriteColors.includes(color)
      ? prefs.favoriteColors.filter((c) => c !== color)
      : [...prefs.favoriteColors, color]
    updatePrefs({ favoriteColors: next })
  }

  function toggleBrand(brand: string) {
    const next = prefs.preferredBrands.includes(brand)
      ? prefs.preferredBrands.filter((b) => b !== brand)
      : [...prefs.preferredBrands, brand]
    updatePrefs({ preferredBrands: next })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="rounded-xl bg-forest p-6 text-white shadow-md">
        <h1 className="text-2xl font-bold">My profile</h1>
        <p className="mt-1 text-forest-50/90 text-sm">
          Signed in as <span className="font-semibold">{current.name}</span>.
          Your preferences personalise Discover, default sizes, and product
          highlights. Switch accounts from the top-right. Changes save
          automatically.
        </p>
      </div>

      {/* Sizes */}
      <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Your sizes</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Per category — leave any blank if it doesn't apply.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SIZED_CATEGORIES.map((category) => (
            <label key={category} className="text-sm">
              <span className="mb-1 block font-medium text-gray-600">
                {formatCategory(category)}
              </span>
              <select
                value={prefs.sizesByCategory[category] ?? ''}
                onChange={(e) => setSizeFor(category, e.target.value)}
                className="w-full rounded-xl border border-slate-bg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
              >
                <option value="">No preference</option>
                {getSizesForCategory(category).map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      {/* Favourite colours */}
      <section className="mt-5 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Favourite colours</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Matching products are highlighted across the app.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {COLORS.map((color) => {
            const active = prefs.favoriteColors.includes(color)
            return (
              <button
                key={color}
                type="button"
                onClick={() => toggleColor(color)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-amber text-white'
                    : 'border border-slate-bg bg-white text-gray-700 hover:bg-amber/10'
                }`}
              >
                {color}
              </button>
            )
          })}
        </div>
      </section>

      {/* Budget */}
      <section className="mt-5 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Budget (CHF)</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-600">Min</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={prefs.budgetMinChf?.toString() ?? ''}
              onChange={(e) =>
                updatePrefs({ budgetMinChf: parseAmount(e.target.value) })
              }
              placeholder="—"
              className="w-32 rounded-xl border border-slate-bg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-gray-600">Max</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={prefs.budgetMaxChf?.toString() ?? ''}
              onChange={(e) =>
                updatePrefs({ budgetMaxChf: parseAmount(e.target.value) })
              }
              placeholder="—"
              className="w-32 rounded-xl border border-slate-bg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
            />
          </label>
        </div>
      </section>

      {/* Preferred brands */}
      <section className="mt-5 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Preferred brands</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {BRANDS.map((brand) => {
            const active = prefs.preferredBrands.includes(brand)
            return (
              <button
                key={brand}
                type="button"
                onClick={() => toggleBrand(brand)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-forest text-white'
                    : 'bg-forest-50 text-forest hover:bg-forest-light hover:text-white'
                }`}
              >
                {brand}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
