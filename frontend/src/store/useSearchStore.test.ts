import { describe, it, expect, beforeEach } from 'vitest'
import { useSearchStore, EMPTY_FILTERS } from './useSearchStore'
import { useAppStore } from './useAppStore'
import type { SearchFilters } from '../types'

const F = (o: Partial<SearchFilters>): SearchFilters => ({ ...EMPTY_FILTERS, ...o })

describe('useSearchStore — new search archives then resets', () => {
  beforeEach(() => {
    useSearchStore.setState({ filters: EMPTY_FILTERS, savedSearches: [] })
  })

  it('archives the current search and resets active filters to empty', () => {
    useSearchStore
      .getState()
      .setFilters(F({ tags: ['waterproof'], categories: ['tent'] }))
    useSearchStore.getState().newSearch()

    const s = useSearchStore.getState()
    expect(s.filters).toEqual(EMPTY_FILTERS) // reset
    expect(s.savedSearches).toHaveLength(1) // archived
    expect(s.savedSearches[0].filters.tags).toContain('waterproof')
    expect(s.savedSearches[0].label).toContain('waterproof')
  })

  it('does not archive an empty search', () => {
    useSearchStore.getState().newSearch()
    expect(useSearchStore.getState().savedSearches).toHaveLength(0)
  })

  it('resetting never wipes existing saved history', () => {
    useSearchStore.getState().setFilters(F({ tags: ['down'] }))
    useSearchStore.getState().newSearch()
    useSearchStore.getState().setFilters(F({ tags: ['merino'] }))
    useSearchStore.getState().newSearch()
    expect(useSearchStore.getState().savedSearches).toHaveLength(2)

    useSearchStore.getState().clearFilters()
    useSearchStore.getState().newSearch()
    expect(useSearchStore.getState().savedSearches).toHaveLength(2) // untouched
  })

  it('restores an archived search back into the active filters', () => {
    useSearchStore.getState().setFilters(F({ colors: ['Teal'] }))
    useSearchStore.getState().newSearch()
    const id = useSearchStore.getState().savedSearches[0].id
    useSearchStore.getState().restoreSearch(id)
    expect(useSearchStore.getState().filters.colors).toContain('Teal')
  })
})

describe('useAppStore — crossing an item off marks it bought (optimistic)', () => {
  beforeEach(() => {
    useAppStore.setState({ shoppingList: [], purchases: [] })
  })

  it('flips bought + checked + purchasedAt, then toggles back', () => {
    const pid = 'P001'
    useAppStore.getState().addToList(pid)

    useAppStore.getState().toggleBought(pid)
    let item = useAppStore
      .getState()
      .shoppingList.find((i) => i.productId === pid)!
    expect(item.bought).toBe(true)
    expect(item.checked).toBe(true)
    expect(typeof item.purchasedAt).toBe('number')

    useAppStore.getState().toggleBought(pid)
    item = useAppStore.getState().shoppingList.find((i) => i.productId === pid)!
    expect(item.bought).toBe(false)
    expect(item.purchasedAt).toBeUndefined()
  })
})
