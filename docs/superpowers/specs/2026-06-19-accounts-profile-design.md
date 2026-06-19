# Mock Accounts & Profile Preferences — Design

**Date:** 2026-06-19
**Status:** Approved (design), pending implementation plan

## Goal

Let a user "have an account" with a profile that stores personal preferences —
clothing size and favourite colour — and let those preferences personalize the
shopping experience. Authentication is mocked: two pre-seeded accounts, switched
from the nav bar. No login screen, passwords, or backend changes.

## Scope

In scope:
- Two hardcoded mock accounts with editable preferences.
- Account switching from the NavBar (always one active account).
- A `/profile` page to view and edit the active account's preferences.
- Three personalization touch-points (AI Discover, size auto-select, colour
  highlight).
- Persistence of the active account + edits across page refresh (localStorage).

Out of scope:
- Real authentication, signup, passwords, or sessions.
- Backend (Django) changes — everything is client-side.
- A new automated test suite (manual smoke check only; this is a hackathon mock).

## Data Model

```ts
interface UserPrefs {
  size?: string            // apparel size, e.g. "M"
  favouriteColor?: string  // catalog colour, e.g. "Teal"
}

interface Account {
  id: string
  name: string
  prefs: UserPrefs
}
```

Curated apparel size options for the profile picker (the raw catalog mixes
apparel, shoe, and volume sizes, so we offer a clean apparel list):
`['XS', 'S', 'M', 'L', 'XL', 'XXL']`.

Favourite-colour options are derived from the catalog at runtime via a new
`getColors()` helper in `lib/products.ts` (mirrors the existing
`getSizesForProduct` / `getCategories` style).

### Seed accounts

| id      | name  | size | favouriteColor |
|---------|-------|------|----------------|
| `lena`  | Lena  | M    | Teal           |
| `marco` | Marco | L    | Orange         |

(All four values exist in `products.json`.)

## State — `useUserStore`

New Zustand store at `src/store/useUserStore.ts`, kept separate from
`useAppStore` so shopping-list logic stays focused. Wrapped in Zustand's
`persist` middleware (localStorage key e.g. `summit-user`) so the chosen account
and any edits survive a refresh.

```ts
interface UserState {
  accounts: Account[]            // seeded with Lena + Marco
  currentUserId: string          // defaults to 'lena'
  switchUser: (id: string) => void
  updatePrefs: (prefs: Partial<UserPrefs>) => void   // updates current account
}
```

A small selector/helper `useCurrentUser()` returns the active `Account` for
convenience in components.

## Components & Routing

- **`/profile` route** — new `ProfilePage.tsx` added to `App.tsx` routes.
  - Shows the active account's name.
  - Clothing size: dropdown of the curated apparel sizes.
  - Favourite colour: swatch picker built from `getColors()`; selecting one calls
    `updatePrefs`.
  - Edits save immediately to the store (no separate "save" round-trip needed,
    but a confirmation toast/inline note is fine).
  - Styling follows the existing forest/amber Tailwind theme.

- **NavBar** — add an account chip on the right showing the current user's
  initials + name, with a dropdown to (a) switch between the two accounts and
  (b) link to `/profile`. Reuses existing `linkClass` styling conventions.

## Deep Integration (personalization)

1. **AI Discover** — `discoverProducts(userPrompt, catalogue, prefs?)` gains an
   optional `prefs` argument. When `prefs` has values, append a line to the user
   message (and/or system prompt) instructing Claude to prefer products that are
   available in the user's size and, when relevance is equal, favour the user's
   favourite colour. When `prefs` is empty, behaviour is identical to today.
   `DiscoverPage` passes `useCurrentUser().prefs`.

2. **Size auto-select** — `useAppStore.addToList` chooses the user's preferred
   size when that product offers it, else falls back to the first available size.
   Because `useAppStore` and `useUserStore` are separate, `addToList` reads the
   current prefs via `useUserStore.getState().` at call time (avoids coupling the
   stores structurally while still personalizing).

3. **Colour highlight** — `ProductCard` receives the active `favouriteColor`
   (via prop or by reading `useCurrentUser()`); when the product's `color`
   matches, it renders a subtle ring/badge (e.g. amber ring + "♥ your colour"
   tag) using existing theme tokens.

## Data Flow

```
useUserStore (accounts, currentUserId)
  ├─ NavBar        → reads current user, switchUser()
  ├─ ProfilePage   → reads current user, updatePrefs()
  ├─ DiscoverPage  → reads prefs → discoverProducts(prompt, catalogue, prefs)
  ├─ addToList     → reads prefs.size at call time for default size
  └─ ProductCard   → reads prefs.favouriteColor → highlight match
```

## Error Handling / Degradation

Every preference is optional. With no size set, `addToList` uses the first
available size (current behaviour). With no favourite colour, no highlight and no
colour instruction in the prompt. If the active account id is somehow missing
from `accounts` (e.g. stale persisted state), fall back to the first account.

## Testing

Manual smoke check (hackathon mock — no new test suite):
1. Switch account in NavBar → active user changes everywhere.
2. Edit size + favourite colour on `/profile` → persists across refresh.
3. Add an item that offers your size → that size is pre-selected.
4. Discover results visibly favour your colour/size when prefs are set.
5. Clear prefs → app behaves exactly as before.

## Files Touched

- `src/store/useUserStore.ts` (new)
- `src/pages/ProfilePage.tsx` (new)
- `src/App.tsx` (add route)
- `src/components/NavBar.tsx` (account chip + switcher)
- `src/store/useAppStore.ts` (size auto-select in `addToList`)
- `src/components/ProductCard.tsx` (colour highlight)
- `src/pages/DiscoverPage.tsx` (pass prefs)
- `src/lib/claude.ts` (optional `prefs` arg on `discoverProducts`)
- `src/lib/products.ts` (`getColors()` helper)
