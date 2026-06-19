import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserPrefs {
  size?: string
  favouriteColor?: string
}

export interface Account {
  id: string
  name: string
  prefs: UserPrefs
}

const SEED_ACCOUNTS: Account[] = [
  { id: 'lena', name: 'Lena', prefs: { size: 'M', favouriteColor: 'Teal' } },
  { id: 'marco', name: 'Marco', prefs: { size: 'L', favouriteColor: 'Orange' } },
]

interface UserState {
  accounts: Account[]
  currentUserId: string
  switchUser: (id: string) => void
  updatePrefs: (prefs: Partial<UserPrefs>) => void
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
    { name: 'summit-user', version: 1 },
  ),
)

function resolveCurrent(state: UserState): Account {
  return state.accounts.find((a) => a.id === state.currentUserId) ?? state.accounts[0]
}

/** React hook: the currently active account (falls back to the first if id is stale). */
export function useCurrentUser(): Account {
  return useUserStore(resolveCurrent)
}

/** Non-hook accessor for reading prefs inside other stores. */
export function getCurrentPrefs(): UserPrefs {
  return resolveCurrent(useUserStore.getState()).prefs
}
