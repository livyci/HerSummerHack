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

const SEED_ACCOUNTS: Account[] = [
  {
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
  },
  {
    id: 'marco',
    name: 'Marco',
    prefs: {
      sizesByCategory: {
        hardshell: 'L',
        'insulated-jacket': 'L',
        'rain-jacket': 'L',
        fleece: 'L',
        'base-layer': 'L',
        trousers: 'L',
        gloves: 'L',
        socks: 'L',
        boots: '44',
        'trail-shoes': '44',
        'approach-shoes': '44',
      },
      favoriteColors: ['Orange'],
      budgetMinChf: null,
      budgetMaxChf: 500,
      preferredBrands: ['Alpitec'],
    },
  },
]

interface UserState {
  accounts: Account[]
  currentUserId: string
  switchUser: (id: string) => void
  updatePrefs: (prefs: Partial<UserPreferences>) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      accounts: SEED_ACCOUNTS,
      currentUserId: 'lena',
      switchUser: (id) =>
        set((state) =>
          state.accounts.some((a) => a.id === id) ? { currentUserId: id } : state,
        ),
      updatePrefs: (prefs) =>
        set((state) => ({
          accounts: state.accounts.map((a) =>
            a.id === state.currentUserId
              ? { ...a, prefs: { ...a.prefs, ...prefs } }
              : a,
          ),
        })),
    }),
    {
      name: 'summit-user',
      version: 2,
      partialize: (state) => ({
        accounts: state.accounts,
        currentUserId: state.currentUserId,
      }),
      // v1 stored a different prefs shape ({size, favouriteColor}); reset to seeds.
      migrate: () => ({ accounts: SEED_ACCOUNTS, currentUserId: 'lena' }),
    },
  ),
)

function resolveCurrent(state: UserState): Account {
  return (
    state.accounts.find((a) => a.id === state.currentUserId) ?? state.accounts[0]
  )
}

/** React hook: the currently active account (falls back to the first if stale). */
export function useCurrentUser(): Account {
  return useUserStore(resolveCurrent)
}

/** Non-hook accessor for reading the active account's prefs inside other stores. */
export function getCurrentPrefs(): UserPreferences {
  const current = resolveCurrent(useUserStore.getState())
  return current ? current.prefs : EMPTY_PREFS
}
