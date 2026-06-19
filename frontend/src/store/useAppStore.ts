import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShoppingListItem, ScannedItem, SearchHistoryEntry } from '../types'
import { getSizesForProduct, getProductById } from '../lib/products'
import { apiFetch } from '../api'
import { getCurrentPrefs } from './useUserStore'

const MAX_SEARCH_HISTORY = 12

// The app is always signed in as this demo account against the real backend.
const LENA_USERNAME = 'lena'
const LENA_PASSWORD = 'summit-lena-2026'

interface AppState {
  shoppingList: ShoppingListItem[]
  scannedHistory: ScannedItem[]
  searchHistory: SearchHistoryEntry[]
  addToList: (productId: string) => void
  removeFromList: (productId: string) => void
  toggleChecked: (productId: string) => void
  toggleBought: (productId: string) => void
  setSize: (productId: string, size: string) => void
  addScan: (productCode: string) => void
  addSearch: (prompt: string, productIds: string[]) => void
  clearSearchHistory: () => void
  token: string | null
  username: string | null
  purchases: string[]
  authError: string | null
  register: (username: string, password: string) => Promise<boolean>
  login: (username: string, password: string) => Promise<boolean>
  ensureLena: () => Promise<void>
  logout: () => void
  loadPurchases: () => Promise<void>
  markAsBought: (productId: string) => Promise<void>
  unmarkBought: (productId: string) => Promise<void>
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
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

      // Crossing an item off = buying it. Optimistically flips the item's
      // bought status (with a purchasedAt stamp) and delegates to the purchase
      // actions, which sync to the backend and roll back on failure.
      toggleBought: (productId) => {
        const item = get().shoppingList.find((i) => i.productId === productId)
        const nextBought = !item?.bought
        set((state) => ({
          shoppingList: state.shoppingList.map((i) =>
            i.productId === productId
              ? {
                  ...i,
                  checked: nextBought,
                  bought: nextBought,
                  purchasedAt: nextBought ? Date.now() : undefined,
                }
              : i,
          ),
        }))
        if (nextBought) void get().markAsBought(productId)
        else void get().unmarkBought(productId)
      },

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

      token: localStorage.getItem('token'),
      username: localStorage.getItem('username'),
      purchases: [],
      authError: null,

      register: async (username, password) => {
        set({ authError: null })
        try {
          const res = await apiFetch('/api/auth/register/', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          })
          const data = await res.json()
          if (!res.ok) {
            set({ authError: data.error ?? 'Registration failed.' })
            return false
          }
          localStorage.setItem('token', data.token)
          localStorage.setItem('username', data.username)
          set({ token: data.token, username: data.username, authError: null })
          await get().loadPurchases()
          return true
        } catch {
          set({ authError: 'Network error. Please try again.' })
          return false
        }
      },

      login: async (username, password) => {
        set({ authError: null })
        try {
          const res = await apiFetch('/api/auth/login/', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          })
          const data = await res.json()
          if (!res.ok) {
            set({ authError: data.error ?? 'Login failed.' })
            return false
          }
          localStorage.setItem('token', data.token)
          localStorage.setItem('username', data.username)
          set({ token: data.token, username: data.username, authError: null })
          await get().loadPurchases()
          return true
        } catch {
          set({ authError: 'Network error. Please try again.' })
          return false
        }
      },

      // Ensure the session is signed in as Lena, using the real backend auth.
      // Logs in if the Lena account exists, otherwise registers it. Best-effort:
      // if the backend is unreachable the rest of the app still works.
      ensureLena: async () => {
        if (get().token && get().username === LENA_USERNAME) {
          await get().loadPurchases()
          return
        }
        // A different/stale session — drop it and sign in as Lena.
        if (get().token) get().logout()
        const ok = await get().login(LENA_USERNAME, LENA_PASSWORD)
        if (!ok) await get().register(LENA_USERNAME, LENA_PASSWORD)
        set({ authError: null })
      },

      logout: () => {
        // best-effort server-side token deletion; ignore result
        apiFetch('/api/auth/logout/', { method: 'POST' }).catch(() => {})
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        set({ token: null, username: null, purchases: [], authError: null })
      },

      loadPurchases: async () => {
        if (!get().token) return
        try {
          const res = await apiFetch('/api/purchases/')
          if (res.status === 401) {
            get().logout()
            return
          }
          if (!res.ok) return
          const data = await res.json()
          set({ purchases: data.product_ids ?? [] })
        } catch {
          /* leave purchases as-is on network error */
        }
      },

      markAsBought: async (productId) => {
        if (!get().token) return
        if (get().purchases.includes(productId)) return
        const previous = get().purchases
        set({ purchases: [...previous, productId] }) // optimistic
        try {
          const res = await apiFetch('/api/purchases/', {
            method: 'POST',
            body: JSON.stringify({ product_id: productId }),
          })
          if (res.status === 401) {
            get().logout()
            return
          }
          if (!res.ok) {
            set({ purchases: previous }) // rollback
            return
          }
          const data = await res.json()
          set({ purchases: data.product_ids ?? previous })
        } catch {
          set({ purchases: previous }) // rollback
        }
      },

      unmarkBought: async (productId) => {
        if (!get().token) return
        const previous = get().purchases
        set({ purchases: previous.filter((id) => id !== productId) }) // optimistic
        try {
          const res = await apiFetch(`/api/purchases/${productId}/`, {
            method: 'DELETE',
          })
          if (res.status === 401) {
            get().logout()
            return
          }
          if (!res.ok) {
            set({ purchases: previous }) // rollback
            return
          }
          const data = await res.json()
          set({ purchases: data.product_ids ?? previous })
        } catch {
          set({ purchases: previous }) // rollback
        }
      },
    }),
    {
      name: 'summit-smart-store',
      // Persist the cart, scan log, and search history across reloads. Auth
      // token/username live under their own localStorage keys; purchases are
      // loaded fresh from the backend on mount.
      partialize: (state) => ({
        shoppingList: state.shoppingList,
        scannedHistory: state.scannedHistory,
        searchHistory: state.searchHistory,
      }),
    },
  ),
)
