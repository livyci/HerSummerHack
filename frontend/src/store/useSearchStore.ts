import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SearchFilters, SavedSearch } from '../types'
import { formatCategory } from '../lib/format'

/** A search with nothing selected — the full-catalogue / "no active search" state. */
export const EMPTY_FILTERS: SearchFilters = {
  categories: [],
  tags: [],
  colors: [],
  priceMaxChf: null,
  freeText: '',
}

const MAX_SAVED_SEARCHES = 20

type FiltersUpdater = SearchFilters | ((prev: SearchFilters) => SearchFilters)

interface SearchState {
  /** The active Discover search filters, shared so the Shopping page can compare scans against them. */
  filters: SearchFilters
  /** Past searches, archived when the shopper starts a new one. Persisted. */
  savedSearches: SavedSearch[]
  /** Set filters with a value or a React-style updater (mirrors useState's setter). */
  setFilters: (update: FiltersUpdater) => void
  clearFilters: () => void
  /** Archive the current search (if any) into savedSearches, then reset to empty. */
  newSearch: () => void
  /** Restore an archived search back into the active filters. */
  restoreSearch: (id: string) => void
  clearSavedSearches: () => void
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/** True when the search carries any content worth archiving. */
function hasContent(f: SearchFilters): boolean {
  return (
    f.categories.length > 0 ||
    f.tags.length > 0 ||
    f.colors.length > 0 ||
    f.priceMaxChf !== null ||
    f.freeText.trim() !== ''
  )
}

/** A short human label summarising a search, for the Saved History list. */
export function describeFilters(f: SearchFilters): string {
  const parts: string[] = [
    ...f.categories.map(formatCategory),
    ...f.tags,
    ...f.colors,
  ]
  if (f.priceMaxChf !== null) parts.push(`≤ CHF ${f.priceMaxChf}`)
  if (parts.length > 0) return parts.join(', ')
  if (f.freeText.trim()) return f.freeText.trim()
  return 'All gear'
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      filters: EMPTY_FILTERS,
      savedSearches: [],

      setFilters: (update) =>
        set((state) => ({
          filters:
            typeof update === 'function' ? update(state.filters) : update,
        })),

      clearFilters: () => set({ filters: EMPTY_FILTERS }),

      newSearch: () => {
        const current = get().filters
        // Archive the previous search FIRST (never lose history), then reset.
        if (hasContent(current)) {
          const entry: SavedSearch = {
            id: newId(),
            label: describeFilters(current),
            filters: current,
            at: Date.now(),
          }
          set((state) => ({
            savedSearches: [entry, ...state.savedSearches].slice(
              0,
              MAX_SAVED_SEARCHES,
            ),
          }))
        }
        set({ filters: EMPTY_FILTERS })
      },

      restoreSearch: (id) => {
        const found = get().savedSearches.find((s) => s.id === id)
        if (found) set({ filters: found.filters })
      },

      clearSavedSearches: () => set({ savedSearches: [] }),
    }),
    {
      name: 'summit-search',
      // Persist only the archived history — the live `filters` stay in-memory.
      partialize: (state) => ({ savedSearches: state.savedSearches }),
    },
  ),
)

/**
 * Whether the shopper has set at least one real constraint. Unmapped free text
 * alone does not count — it imposes no filter, so there's nothing to compare a
 * scan against.
 */
export function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    filters.categories.length > 0 ||
    filters.tags.length > 0 ||
    filters.colors.length > 0 ||
    filters.priceMaxChf !== null
  )
}
