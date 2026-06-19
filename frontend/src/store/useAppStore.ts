import { create } from 'zustand'
import type { ShoppingListItem, ScannedItem } from '../types'
import { getSizesForProduct } from '../lib/products'
import { apiFetch } from '../api'

interface AppState {
  shoppingList: ShoppingListItem[]
  scannedHistory: ScannedItem[]
  addToList: (productId: string) => void
  removeFromList: (productId: string) => void
  toggleChecked: (productId: string) => void
  setSize: (productId: string, size: string) => void
  addScan: (productCode: string) => void
  token: string | null
  username: string | null
  purchases: string[]
  authError: string | null
  register: (username: string, password: string) => Promise<boolean>
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  loadPurchases: () => Promise<void>
  markAsBought: (productId: string) => Promise<void>
  unmarkBought: (productId: string) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  shoppingList: [],
  scannedHistory: [],

  addToList: (productId) =>
    set((state) => {
      if (state.shoppingList.some((i) => i.productId === productId)) {
        return state
      }
      const sizes = getSizesForProduct(productId)
      const item: ShoppingListItem = {
        productId,
        selectedSize: sizes[0],
        checked: false,
        addedAt: Date.now(),
      }
      return { shoppingList: [...state.shoppingList, item] }
    }),

  removeFromList: (productId) =>
    set((state) => ({
      shoppingList: state.shoppingList.filter((i) => i.productId !== productId),
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
}))
