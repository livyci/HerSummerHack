import { create } from 'zustand'
import type { SearchFilters } from '../types'

/** A search with nothing selected — the full-catalogue / "no active search" state. */
export const EMPTY_FILTERS: SearchFilters = {
  categories: [],
  tags: [],
  colors: [],
  priceMaxChf: null,
  freeText: '',
}

type FiltersUpdater = SearchFilters | ((prev: SearchFilters) => SearchFilters)

interface SearchState {
  /** The active Discover search filters, shared so the Shopping page can compare scans against them. */
  filters: SearchFilters
  /** Set filters with a value or a React-style updater (mirrors useState's setter). */
  setFilters: (update: FiltersUpdater) => void
  clearFilters: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  filters: EMPTY_FILTERS,
  setFilters: (update) =>
    set((state) => ({
      filters: typeof update === 'function' ? update(state.filters) : update,
    })),
  clearFilters: () => set({ filters: EMPTY_FILTERS }),
}))

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
