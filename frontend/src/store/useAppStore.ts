import { create } from 'zustand'
import type { ShoppingListItem, ScannedItem } from '../types'
import { getSizesForProduct } from '../lib/products'

interface AppState {
  shoppingList: ShoppingListItem[]
  scannedHistory: ScannedItem[]
  addToList: (productId: string) => void
  removeFromList: (productId: string) => void
  toggleChecked: (productId: string) => void
  setSize: (productId: string, size: string) => void
  addScan: (productCode: string) => void
}

export const useAppStore = create<AppState>((set) => ({
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
}))
