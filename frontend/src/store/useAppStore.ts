import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShoppingListItem, ScannedItem, SearchHistoryEntry } from '../types'
import { getSizesForProduct, getProductById } from '../lib/products'
import { getCurrentPrefs } from './useUserStore'

const MAX_SEARCH_HISTORY = 12

interface AppState {
  shoppingList: ShoppingListItem[]
  scannedHistory: ScannedItem[]
  searchHistory: SearchHistoryEntry[]
  addToList: (productId: string) => void
  removeFromList: (productId: string) => void
  toggleChecked: (productId: string) => void
  setSize: (productId: string, size: string) => void
  addScan: (productCode: string) => void
  addSearch: (prompt: string, productIds: string[]) => void
  clearSearchHistory: () => void
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      shoppingList: [],
      scannedHistory: [],
      searchHistory: [],

      addToList: (productId) =>
        set((state) => {
          if (state.shoppingList.some((i) => i.productId === productId)) {
            return state
          }
          const sizes = getSizesForProduct(productId)
          // Default to the active account's preferred size for this category.
          const product = getProductById(productId)
          const preferred = product
            ? getCurrentPrefs().sizesByCategory[product.category]
            : undefined
          const selectedSize =
            preferred && sizes.includes(preferred) ? preferred : sizes[0]
          const item: ShoppingListItem = {
            productId,
            selectedSize,
            checked: false,
            addedAt: Date.now(),
          }
          return { shoppingList: [...state.shoppingList, item] }
        }),

      removeFromList: (productId) =>
        set((state) => ({
          shoppingList: state.shoppingList.filter(
            (i) => i.productId !== productId,
          ),
        })),

      toggleChecked: (productId) =>
        set((state) => ({
          shoppingList: state.shoppingList.map((i) =>
            i.productId === productId ? { ...i, checked: !i.checked } : i,
          ),
        })),

      setSize: (productId, size) =>
        set((state) => ({
          shoppingList: state.shoppingList.map((i) =>
            i.productId === productId ? { ...i, selectedSize: size } : i,
          ),
        })),

      addScan: (productCode) =>
        set((state) => ({
          scannedHistory: [
            { productCode, scannedAt: Date.now() },
            ...state.scannedHistory,
          ],
        })),

      addSearch: (prompt, productIds) =>
        set((state) => {
          const trimmed = prompt.trim()
          if (!trimmed) return state
          const key = trimmed.toLowerCase()
          const entry: SearchHistoryEntry = {
            id: newId(),
            prompt: trimmed,
            productIds,
            at: Date.now(),
          }
          // Drop any earlier entry with the same question, then prepend.
          const deduped = state.searchHistory.filter(
            (e) => e.prompt.toLowerCase() !== key,
          )
          return {
            searchHistory: [entry, ...deduped].slice(0, MAX_SEARCH_HISTORY),
          }
        }),

      clearSearchHistory: () => set({ searchHistory: [] }),
    }),
    {
      name: 'summit-smart-store',
      // Persist the cart, scan log, and search history across reloads.
      partialize: (state) => ({
        shoppingList: state.shoppingList,
        scannedHistory: state.scannedHistory,
        searchHistory: state.searchHistory,
      }),
    },
  ),
)
