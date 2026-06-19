import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserPreferences } from '../types'
import {
  getCategories,
  getColors,
  getBrands,
  getSizesForCategory,
} from '../lib/products'
import { formatCategory } from '../lib/format'
import { usePreferencesStore } from '../store/usePreferencesStore'

// Only categories with a real size choice are worth a picker (skips one-size).
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

export default function PreferencesPage() {
  const navigate = useNavigate()
  const preferences = usePreferencesStore((s) => s.preferences)
  const setPreferences = usePreferencesStore((s) => s.setPreferences)
  const skippedOnboarding = usePreferencesStore((s) => s.skippedOnboarding)
  const skipOnboarding = usePreferencesStore((s) => s.skipOnboarding)

  const [sizes, setSizes] = useState<Record<string, string>>(
    preferences.sizesByCategory,
  )
  const [colors, setColors] = useState<string[]>(preferences.favoriteColors)
  const [brands, setBrands] = useState<string[]>(preferences.preferredBrands)
  const [budgetMin, setBudgetMin] = useState(
    preferences.budgetMinChf?.toString() ?? '',
  )
  const [budgetMax, setBudgetMax] = useState(
    preferences.budgetMaxChf?.toString() ?? '',
  )
  const [saved, setSaved] = useState(false)

  const firstTime = !preferences.onboarded

  function setSizeFor(category: string, size: string) {
    setSizes((prev) => {
      const next = { ...prev }
      if (size) next[category] = size
      else delete next[category]
      return next
    })
    setSaved(false)
  }

  function toggleColor(color: string) {
    setColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color],
    )
    setSaved(false)
  }

  function toggleBrand(brand: string) {
    setBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand],
    )
    setSaved(false)
  }

  function handleSave() {
    const next: UserPreferences = {
      sizesByCategory: sizes,
      favoriteColors: colors,
      preferredBrands: brands,
      budgetMinChf: parseAmount(budgetMin),
      budgetMaxChf: parseAmount(budgetMax),
      onboarded: true,
    }
    setPreferences(next)
    setSaved(true)
  }

  function handleSkip() {
    skipOnboarding()
    navigate('/')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {firstTime && (
        <div className="mb-6 rounded-xl bg-forest p-6 text-white shadow-md">
          <h1 className="text-2xl font-bold">Set up your preferences</h1>
          <p className="mt-2 text-sm text-forest-50/90">
            Tell us your sizes, favourite colours, budget, and go-to brands so
            Discover can tailor recommendations to you. You can change these any
            time.
          </p>
        </div>
      )}

      {!firstTime && (
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Your preferences
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Used to personalise your Discover recommendations.
          </p>
        </div>
      )}

      {/* Sizes */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
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
                value={sizes[category] ?? ''}
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
        <div className="mt-3 flex flex-wrap gap-2">
          {COLORS.map((color) => {
            const active = colors.includes(color)
            return (
              <button
                key={color}
                type="button"
                onClick={() => toggleColor(color)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-forest text-white'
                    : 'bg-forest-50 text-forest hover:bg-forest-light hover:text-white'
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
              value={budgetMin}
              onChange={(e) => {
                setBudgetMin(e.target.value)
                setSaved(false)
              }}
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
              value={budgetMax}
              onChange={(e) => {
                setBudgetMax(e.target.value)
                setSaved(false)
              }}
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
            const active = brands.includes(brand)
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

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-forest px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-dark"
        >
          {firstTime ? 'Save & continue' : 'Save preferences'}
        </button>
        {firstTime && !skippedOnboarding && (
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-forest hover:underline"
          >
            Skip for now
          </button>
        )}
        {!firstTime && (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-forest hover:underline"
          >
            Back to Discover
          </button>
        )}
        {saved && (
          <span className="text-sm font-medium text-forest">
            ✓ Saved{firstTime ? '' : ' — your preferences are up to date'}
          </span>
        )}
      </div>
      {saved && firstTime && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-xl bg-amber px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-dark"
          >
            Go to Discover →
          </button>
        </div>
      )}
    </div>
  )
}
