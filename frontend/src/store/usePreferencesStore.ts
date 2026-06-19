import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserPreferences } from '../types'

/** Default preferences for a brand-new (un-onboarded) shopper. */
const EMPTY_PREFERENCES: UserPreferences = {
  sizesByCategory: {},
  favoriteColors: [],
  budgetMinChf: null,
  budgetMaxChf: null,
  preferredBrands: [],
  onboarded: false,
}

interface PreferencesState {
  preferences: UserPreferences
  /** Session-only flag set by "Skip for now"; intentionally NOT persisted. */
  skippedOnboarding: boolean
  setPreferences: (prefs: UserPreferences) => void
  skipOnboarding: () => void
  resetPreferences: () => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      preferences: EMPTY_PREFERENCES,
      skippedOnboarding: false,
      setPreferences: (prefs) => set({ preferences: prefs }),
      skipOnboarding: () => set({ skippedOnboarding: true }),
      resetPreferences: () => set({ preferences: EMPTY_PREFERENCES }),
    }),
    {
      name: 'summit-preferences',
      // Only the preferences survive reloads; skippedOnboarding is per-session.
      partialize: (state) => ({ preferences: state.preferences }),
    },
  ),
)
