import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserPreferences } from '../types'

export interface Account {
  id: string
  name: string
  prefs: UserPreferences
}

const EMPTY_PREFS: UserPreferences = {
  sizesByCategory: {},
  favoriteColors: [],
  budgetMinChf: null,
  budgetMaxChf: null,
  preferredBrands: [],
}

/** The single demo account. The app is always signed in as Lena. */
const LENA: Account = {
  id: 'lena',
  name: 'Lena',
  prefs: {
    sizesByCategory: {
      hardshell: 'M',
      'insulated-jacket': 'M',
      'rain-jacket': 'M',
      fleece: 'M',
      'base-layer': 'M',
      trousers: 'M',
      gloves: 'M',
      socks: 'M',
      boots: '40',
      'trail-shoes': '40',
      'approach-shoes': '40',
    },
    favoriteColors: ['Teal'],
    budgetMinChf: null,
    budgetMaxChf: 300,
    preferredBrands: ['Nordfjell'],
  },
}

interface UserState {
  user: Account
  updatePrefs: (prefs: Partial<UserPreferences>) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: LENA,
      updatePrefs: (prefs) =>
        set((state) => ({
          user: { ...state.user, prefs: { ...state.user.prefs, ...prefs } },
        })),
    }),
    {
      name: 'summit-user',
      version: 3,
      partialize: (state) => ({ user: state.user }),
      // Earlier versions stored a multi-account shape; reset to the single
      // Lena account so persisted state matches the new schema.
      migrate: () => ({ user: LENA }),
    },
  ),
)

/** React hook: the signed-in account (always Lena). */
export function useCurrentUser(): Account {
  return useUserStore((s) => s.user)
}

/** Non-hook accessor for reading the signed-in account's prefs in other stores. */
export function getCurrentPrefs(): UserPreferences {
  return useUserStore.getState().user?.prefs ?? EMPTY_PREFS
}
