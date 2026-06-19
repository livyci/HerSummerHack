import { useCurrentUser, useUserStore } from '../store/useUserStore'
import { APPAREL_SIZES, getColors } from '../lib/products'

export default function ProfilePage() {
  const current = useCurrentUser()
  const updatePrefs = useUserStore((s) => s.updatePrefs)
  const colors = getColors()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="rounded-xl bg-forest p-6 text-white shadow-md">
        <h1 className="text-2xl font-bold">My profile</h1>
        <p className="mt-1 text-forest-50/90 text-sm">
          Signed in as <span className="font-semibold">{current.name}</span>. Your
          preferences personalize Discover, default sizes, and product highlights.
        </p>
      </div>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        {/* Size */}
        <label className="block text-sm font-semibold text-gray-800">
          Clothing size
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {APPAREL_SIZES.map((size) => {
            const active = current.prefs.size === size
            return (
              <button
                key={size}
                type="button"
                onClick={() => updatePrefs({ size })}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-forest text-white'
                    : 'border border-slate-bg bg-white text-gray-700 hover:bg-forest-50'
                }`}
              >
                {size}
              </button>
            )
          })}
        </div>

        {/* Favourite colour */}
        <label className="mt-6 block text-sm font-semibold text-gray-800">
          Favourite colour
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {colors.map((color) => {
            const active = current.prefs.favouriteColor === color
            return (
              <button
                key={color}
                type="button"
                onClick={() => updatePrefs({ favouriteColor: color })}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-amber text-white ring-2 ring-amber-dark'
                    : 'border border-slate-bg bg-white text-gray-700 hover:bg-amber/10'
                }`}
              >
                {color}
              </button>
            )
          })}
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Changes save automatically.
        </p>
      </div>
    </div>
  )
}
