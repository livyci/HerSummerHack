import { useState } from 'react'
import type { SearchFilters } from '../types'
import { parsePromptToFilters, MissingApiKeyError } from '../lib/claude'
import {
  getUniqueProducts,
  explainRecommendation,
  getAllTags,
  getCategories,
  getColors,
} from '../lib/products'
import { recommendByFilters } from '../lib/recommend'
import { formatCategory } from '../lib/format'
import { useAppStore } from '../store/useAppStore'
import { useCurrentUser } from '../store/useUserStore'
import { useSearchStore, EMPTY_FILTERS, hasActiveFilters } from '../store/useSearchStore'
import ProductCard from '../components/ProductCard'

const AVAILABLE_TAGS = getAllTags()
const AVAILABLE_CATEGORIES = getCategories()
const AVAILABLE_COLORS = getColors()
const CATALOGUE = getUniqueProducts()

const EXAMPLE_PROMPTS = [
  'I want to go hiking in wet weather for 3 days',
  'Lightweight camping gear for a summer trek',
  'Warm layers for an alpine winter ascent',
]

type FilterKind = 'categories' | 'tags' | 'colors'

/** Union new filters into existing ones; newest budget wins if both set one. */
function mergeFilters(base: SearchFilters, incoming: SearchFilters): SearchFilters {
  const union = (a: string[], b: string[]) => Array.from(new Set([...a, ...b]))
  return {
    categories: union(base.categories, incoming.categories),
    tags: union(base.tags, incoming.tags),
    colors: union(base.colors, incoming.colors),
    priceMaxChf: incoming.priceMaxChf ?? base.priceMaxChf,
    freeText: incoming.freeText || base.freeText,
  }
}

export default function DiscoverPage() {
  const preferences = useCurrentUser().prefs
  const addToList = useAppStore((s) => s.addToList)
  const shoppingList = useAppStore((s) => s.shoppingList)
  const purchases = useAppStore((s) => s.purchases)
  const token = useAppStore((s) => s.token)
  const markAsBought = useAppStore((s) => s.markAsBought)
  const unmarkBought = useAppStore((s) => s.unmarkBought)

  // Filters live in a shared store so the Shopping page can compare scans
  // against the same search the shopper set here.
  const filters = useSearchStore((s) => s.filters)
  const setFilters = useSearchStore((s) => s.setFilters)

  const [prompt, setPrompt] = useState('')
  const [engaged, setEngaged] = useState(() =>
    hasActiveFilters(useSearchStore.getState().filters),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddFilter, setShowAddFilter] = useState(false)

  // Pure, synchronous — recomputed on every render, no AI call. Already-bought
  // items are filtered out so we never re-suggest gear the shopper owns.
  const ownedSet = new Set(purchases)
  const results = engaged
    ? recommendByFilters(CATALOGUE, filters, preferences)
        .map((s) => s.product)
        .filter((p) => !ownedSet.has(p.product_id))
    : []

  const activeCount =
    filters.categories.length +
    filters.tags.length +
    filters.colors.length +
    (filters.priceMaxChf !== null ? 1 : 0)

  // Soft budget from preferences applies only when no explicit price filter.
  const softBudget =
    filters.priceMaxChf === null ? preferences.budgetMaxChf : null

  async function handleSubmit() {
    const trimmed = prompt.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)
    try {
      const parsed = await parsePromptToFilters(
        trimmed,
        AVAILABLE_TAGS,
        AVAILABLE_CATEGORIES,
        AVAILABLE_COLORS,
      )
      setFilters((prev) => mergeFilters(prev, parsed))
      setEngaged(true)
      setPrompt('')
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        setError(err.message)
      } else {
        console.error('Claude API error:', err)
        const msg = err instanceof Error ? err.message : String(err)
        setError(`Something went wrong: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }

  function addFilterValue(kind: FilterKind, value: string) {
    if (!value) return
    setFilters((prev) => ({
      ...prev,
      [kind]: Array.from(new Set([...prev[kind], value])),
    }))
    setEngaged(true)
  }

  function removeFilterValue(kind: FilterKind, value: string) {
    setFilters((prev) => ({
      ...prev,
      [kind]: prev[kind].filter((v) => v !== value),
    }))
  }

  function clearAll() {
    setFilters(EMPTY_FILTERS)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero + free-text search (available before and after the first search) */}
      <div className="rounded-xl bg-forest p-6 sm:p-8 shadow-md text-white">
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          Find your perfect gear
        </h1>
        <p className="mt-2 text-forest-50/90 text-sm sm:text-base">
          Describe your adventure — we'll turn it into filters you can fine-tune.
          Add another phrase any time to narrow things down.
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
            {loading ? 'Reading…' : engaged ? 'Add to search' : 'Find for me'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Active filters + controls */}
      {engaged && (
        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-gray-900">Your filters</h2>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAddFilter((v) => !v)}
                className="text-xs font-semibold text-forest hover:underline"
              >
                + Add filter
              </button>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>

          {/* Chips */}
          {activeCount === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              No filters — showing the full catalogue. Add a phrase above or a
              filter to narrow down.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {filters.categories.map((c) => (
                <Chip
                  key={`cat-${c}`}
                  label={formatCategory(c)}
                  onRemove={() => removeFilterValue('categories', c)}
                />
              ))}
              {filters.tags.map((t) => (
                <Chip
                  key={`tag-${t}`}
                  label={t}
                  onRemove={() => removeFilterValue('tags', t)}
                />
              ))}
              {filters.colors.map((c) => (
                <Chip
                  key={`color-${c}`}
                  label={c}
                  onRemove={() => removeFilterValue('colors', c)}
                />
              ))}
              {filters.priceMaxChf !== null && (
                <Chip
                  label={`≤ CHF ${filters.priceMaxChf}`}
                  onRemove={() =>
                    setFilters((prev) => ({ ...prev, priceMaxChf: null }))
                  }
                />
              )}
            </div>
          )}

          {/* Unmapped wording (display only) */}
          {filters.freeText && (
            <p className="mt-3 text-xs text-gray-400">
              Couldn't map to a filter: "{filters.freeText}"
            </p>
          )}

          {/* Soft budget note */}
          {softBudget !== null && (
            <p className="mt-2 text-xs text-gray-400">
              Showing items within your CHF {softBudget} budget (from your
              preferences).
            </p>
          )}

          {/* Add-filter panel */}
          {showAddFilter && (
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-bg pt-4 sm:grid-cols-3">
              <AddFilterSelect
                label="Category"
                placeholder="Add category…"
                options={AVAILABLE_CATEGORIES.map((c) => ({
                  value: c,
                  label: formatCategory(c),
                }))}
                onPick={(v) => addFilterValue('categories', v)}
              />
              <AddFilterSelect
                label="Tag"
                placeholder="Add tag…"
                options={AVAILABLE_TAGS.map((t) => ({ value: t, label: t }))}
                onPick={(v) => addFilterValue('tags', v)}
              />
              <AddFilterSelect
                label="Colour"
                placeholder="Add colour…"
                options={AVAILABLE_COLORS.map((c) => ({ value: c, label: c }))}
                onPick={(v) => addFilterValue('colors', v)}
              />
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-10 flex flex-col items-center justify-center gap-3 text-gray-600">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-forest-50 border-t-forest" />
          <p className="text-sm font-medium">Reading your request…</p>
        </div>
      )}

      {/* Empty initial state */}
      {!engaged && !loading && (
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

      {/* Results */}
      {engaged && !loading && (
        <div className="mt-8">
          {results.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm">
              No gear matches these filters. Remove a chip or{' '}
              <button
                type="button"
                onClick={clearAll}
                className="font-semibold text-forest hover:underline"
              >
                clear all filters
              </button>
              .
            </div>
          ) : (
            <>
              <h2 className="mb-4 text-lg font-bold text-gray-900">
                {results.length} match{results.length === 1 ? '' : 'es'}
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
                    reasons={explainRecommendation(product, filters, preferences)}
                    favoriteColors={preferences.favoriteColors}
                    owned={purchases.includes(product.product_id)}
                    onMarkBought={token ? markAsBought : undefined}
                    onUnmarkBought={token ? unmarkBought : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface ChipProps {
  label: string
  onRemove: () => void
}

function Chip({ label, onRemove }: ChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1.5 text-sm font-medium text-forest">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="text-forest/60 hover:text-forest"
      >
        ✕
      </button>
    </span>
  )
}

interface AddFilterSelectProps {
  label: string
  placeholder: string
  options: { value: string; label: string }[]
  onPick: (value: string) => void
}

function AddFilterSelect({
  label,
  placeholder,
  options,
  onPick,
}: AddFilterSelectProps) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium text-gray-600">{label}</span>
      <select
        value=""
        onChange={(e) => {
          onPick(e.target.value)
          e.target.value = ''
        }}
        className="w-full rounded-xl border border-slate-bg bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest"
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}
