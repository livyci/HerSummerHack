import { useState } from 'react'
import type { Product } from '../types'
import { discoverProducts, MissingApiKeyError } from '../lib/claude'
import { getUniqueProducts, getProductById } from '../lib/products'
import { useAppStore } from '../store/useAppStore'
import { useCurrentUser } from '../store/useUserStore'
import ProductCard from '../components/ProductCard'

const EXAMPLE_PROMPTS = [
  'I want to go hiking in wet weather for 3 days',
  'Lightweight camping gear for a summer trek',
  'Warm layers for an alpine winter ascent',
]

export default function DiscoverPage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Product[]>([])
  const [searched, setSearched] = useState(false)

  const addToList = useAppStore((s) => s.addToList)
  const shoppingList = useAppStore((s) => s.shoppingList)
  const current = useCurrentUser()

  async function handleSubmit() {
    const trimmed = prompt.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const ids = await discoverProducts(trimmed, getUniqueProducts(), current.prefs)
      const products = ids
        .map((id) => getProductById(id))
        .filter((p): p is Product => p !== undefined)

      // Stable sort: discounted items first, otherwise preserve Claude's order.
      const sorted = products
        .map((p, index) => ({ p, index }))
        .sort((a, b) => {
          const aDisc = a.p.discount_pct > 0 ? 0 : 1
          const bDisc = b.p.discount_pct > 0 ? 0 : 1
          if (aDisc !== bDisc) return aDisc - bDisc
          return a.index - b.index
        })
        .map((entry) => entry.p)

      setResults(sorted)
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        setError(err.message)
      } else {
        setError('Something went wrong calling the AI. Please try again.')
      }
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="rounded-xl bg-forest p-6 sm:p-8 shadow-md text-white">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          Find your perfect gear
        </h1>
        <p className="mt-2 text-forest-50/90 text-sm sm:text-base">
          Tell us about your adventure and let our AI advisor pick the right
          equipment before you even reach the store.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="What are you looking for today? (e.g. 'I want to go hiking in wet weather for 3 days')"
            className="w-full resize-none rounded-xl border border-white/20 bg-white p-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || prompt.trim().length === 0}
            className="self-start rounded-xl bg-amber px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Find for me'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mt-10 flex flex-col items-center justify-center gap-3 text-gray-600">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-forest-50 border-t-forest" />
          <p className="text-sm font-medium">Finding the best gear for you…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty initial state */}
      {!loading && !error && !searched && (
        <div className="mt-10 rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-800">
            Not sure where to start?
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Try one of these to see how it works.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setPrompt(example)}
                className="rounded-full border border-forest-light/40 bg-forest-50 px-4 py-2 text-sm font-medium text-forest transition-colors hover:bg-forest hover:text-white"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results after a search */}
      {!loading && !error && searched && results.length === 0 && (
        <div className="mt-10 rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm">
          No matching gear found. Try describing your trip differently.
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            {results.length} recommendation{results.length === 1 ? '' : 's'} for you
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                onAdd={addToList}
                added={shoppingList.some(
                  (i) => i.productId === product.product_id,
                )}
                favouriteColor={current.prefs.favouriteColor}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
