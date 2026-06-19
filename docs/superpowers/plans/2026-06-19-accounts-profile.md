# Mock Accounts & Profile Preferences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two mock user accounts with editable profile preferences (clothing size, favourite colour) that personalize the shopping experience.

**Architecture:** A new persisted Zustand store (`useUserStore`) holds two seed accounts and the active account id. A `/profile` page edits preferences; a NavBar chip switches accounts. Preferences feed three personalization touch-points: the AI Discover prompt, default size selection when adding to the list, and a favourite-colour highlight on product cards. Frontend-only; no backend changes.

**Tech Stack:** React 19, TypeScript, Vite, Zustand 5 (+ `persist` middleware), React Router 6, Tailwind CSS, `@anthropic-ai/sdk`.

## Global Constraints

- Frontend only — no Django/backend changes.
- No new test suite (per spec). Automated gate per task = `npx tsc -b` (typecheck via `npm run build`) passing with zero errors, plus the manual check listed in the task. Run commands from `frontend/`.
- Every preference is optional; with nothing set the app must behave exactly as it does today.
- Follow the existing forest/amber Tailwind theme and existing code style (no semicolons, single quotes, functional components).
- Seed accounts: `lena` (Lena, size `M`, colour `Teal`) and `marco` (Marco, size `L`, colour `Orange`). Default active account: `lena`.
- Curated apparel sizes for the profile picker: `['XS', 'S', 'M', 'L', 'XL', 'XXL']`.
- localStorage persist key: `summit-user`.

---

### Task 1: Catalog helpers — `getColors()` and `APPAREL_SIZES`

**Files:**
- Modify: `frontend/src/lib/products.ts`

**Interfaces:**
- Produces: `getColors(): string[]` (unique catalog colours, sorted) and `export const APPAREL_SIZES: string[]`.

- [ ] **Step 1: Add the helper and constant**

Append to `frontend/src/lib/products.ts`:

```ts
/** Curated apparel sizes for the profile picker (catalog also has shoe/volume sizes). */
export const APPAREL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

/** All distinct product colours present in the catalog, sorted. */
export function getColors(): string[] {
  return Array.from(new Set(ALL.map((p) => p.color).filter(Boolean))).sort()
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run build`
Expected: build succeeds, no TS errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/products.ts
git commit -m "feat: add getColors() and APPAREL_SIZES catalog helpers"
```

---

### Task 2: `useUserStore` with persisted accounts

**Files:**
- Create: `frontend/src/store/useUserStore.ts`

**Interfaces:**
- Produces:
  - `interface UserPrefs { size?: string; favouriteColor?: string }`
  - `interface Account { id: string; name: string; prefs: UserPrefs }`
  - `useUserStore` (Zustand store) with `accounts`, `currentUserId`, `switchUser(id)`, `updatePrefs(prefs: Partial<UserPrefs>)`.
  - `useCurrentUser(): Account` — React hook returning the active account (falls back to first if id is stale).
  - `getCurrentPrefs(): UserPrefs` — non-hook accessor for use inside other stores.

- [ ] **Step 1: Create the store**

Create `frontend/src/store/useUserStore.ts`:

```ts
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
    { name: 'summit-user' },
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
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run build`
Expected: build succeeds. (If TS complains about the curried `create<UserState>()(...)`, that form is required by Zustand + middleware — keep it.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/useUserStore.ts
git commit -m "feat: add persisted useUserStore with two seed accounts"
```

---

### Task 3: NavBar account chip + switcher

**Files:**
- Modify: `frontend/src/components/NavBar.tsx`

**Interfaces:**
- Consumes: `useCurrentUser`, `useUserStore` from Task 2.

- [ ] **Step 1: Add account chip with switch dropdown and Profile link**

Replace the contents of `frontend/src/components/NavBar.tsx` with:

```tsx
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { useUserStore, useCurrentUser } from '../store/useUserStore'

function linkClass({ isActive }: { isActive: boolean }): string {
  const base = 'px-3 py-2 rounded-full text-sm font-semibold transition-colors'
  return isActive
    ? `${base} bg-amber text-white`
    : `${base} text-forest-50 hover:text-white hover:bg-forest-light`
}

function initials(name: string): string {
  return name.slice(0, 1).toUpperCase()
}

export default function NavBar() {
  const listCount = useAppStore((s) => s.shoppingList.length)
  const accounts = useUserStore((s) => s.accounts)
  const switchUser = useUserStore((s) => s.switchUser)
  const current = useCurrentUser()
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 bg-forest text-white shadow-md">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
        <NavLink to="/" className="text-lg font-bold tracking-tight">
          ⛰ Summit Outfitters
        </NavLink>
        <div className="flex items-center gap-1">
          <NavLink to="/" className={linkClass} end>
            Discover
          </NavLink>
          <NavLink to="/shopping" className={linkClass}>
            {({ isActive }) => (
              <span className="relative inline-flex items-center">
                Shopping
                {listCount > 0 && (
                  <span
                    className={`ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-xs font-bold ${
                      isActive ? 'bg-white text-amber-dark' : 'bg-amber text-white'
                    }`}
                  >
                    {listCount}
                  </span>
                )}
              </span>
            )}
          </NavLink>
          <NavLink to="/admin" className={linkClass}>
            Admin
          </NavLink>

          {/* Account chip */}
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full bg-forest-light px-2 py-1.5 text-sm font-semibold hover:bg-forest-dark"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber text-xs font-bold text-white">
                {initials(current.name)}
              </span>
              <span className="hidden sm:inline">{current.name}</span>
            </button>

            {open && (
              <div
                className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl bg-white py-1 text-gray-800 shadow-lg"
                onMouseLeave={() => setOpen(false)}
              >
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Switch account
                </p>
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      switchUser(a.id)
                      setOpen(false)
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-forest-50 ${
                      a.id === current.id ? 'font-bold text-forest' : ''
                    }`}
                  >
                    {a.name}
                    {a.id === current.id && ' ✓'}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-bg" />
                <NavLink
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-sm hover:bg-forest-50"
                >
                  My profile
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run build`
Expected: build succeeds. (The `/profile` route does not exist yet — that is fine; the link will 404 until Task 4. Do not test-click it yet.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/NavBar.tsx
git commit -m "feat: add account chip and account switcher to NavBar"
```

---

### Task 4: Profile page + route

**Files:**
- Create: `frontend/src/pages/ProfilePage.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useCurrentUser`, `useUserStore` (Task 2); `APPAREL_SIZES`, `getColors` (Task 1).

- [ ] **Step 1: Create the profile page**

Create `frontend/src/pages/ProfilePage.tsx`:

```tsx
import { useCurrentUser, useUserStore } from '../store/useUserStore'
import { APPAREL_SIZES, getColors } from '../lib/products'

export default function ProfilePage() {
  const current = useCurrentUser()
  const updatePrefs = useUserStore((s) => s.updatePrefs)
  const colors = getColors()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="rounded-xl bg-forest p-6 text-white shadow-md">
        <h1 className="text-2xl font-bold">My profile</h1>
        <p className="mt-1 text-forest-50/90 text-sm">
          Signed in as <span className="font-semibold">{current.name}</span>. Your
          preferences personalize Discover, default sizes, and product highlights.
        </p>
      </div>

      <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
        {/* Size */}
        <label className="block text-sm font-semibold text-gray-800">
          Clothing size
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {APPAREL_SIZES.map((size) => {
            const active = current.prefs.size === size
            return (
              <button
                key={size}
                type="button"
                onClick={() => updatePrefs({ size })}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-forest text-white'
                    : 'border border-slate-bg bg-white text-gray-700 hover:bg-forest-50'
                }`}
              >
                {size}
              </button>
            )
          })}
        </div>

        {/* Favourite colour */}
        <label className="mt-6 block text-sm font-semibold text-gray-800">
          Favourite colour
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {colors.map((color) => {
            const active = current.prefs.favouriteColor === color
            return (
              <button
                key={color}
                type="button"
                onClick={() => updatePrefs({ favouriteColor: color })}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-amber text-white ring-2 ring-amber-dark'
                    : 'border border-slate-bg bg-white text-gray-700 hover:bg-amber/10'
                }`}
              >
                {color}
              </button>
            )
          })}
        </div>

        <p className="mt-6 text-sm text-gray-500">
          Changes save automatically.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the route**

In `frontend/src/App.tsx`, add the import and route:

```tsx
import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import DiscoverPage from './pages/DiscoverPage'
import ShoppingPage from './pages/ShoppingPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <NavBar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual check**

Run: `cd frontend && npm run dev`. In the browser: click the account chip → "My profile". Confirm Lena shows size `M` and colour `Teal` highlighted. Change size to `L`, refresh the page, confirm `L` persists. Switch to Marco via the chip, confirm profile shows `L` / `Orange`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ProfilePage.tsx frontend/src/App.tsx
git commit -m "feat: add profile page with size and favourite-colour editing"
```

---

### Task 5: Size auto-select when adding to list

**Files:**
- Modify: `frontend/src/store/useAppStore.ts:19-32`

**Interfaces:**
- Consumes: `getCurrentPrefs` from Task 2.

- [ ] **Step 1: Use the preferred size as the default**

In `frontend/src/store/useAppStore.ts`, add the import near the top:

```ts
import { getCurrentPrefs } from './useUserStore'
```

Replace the `addToList` action body so it prefers the user's size when available:

```ts
  addToList: (productId) =>
    set((state) => {
      if (state.shoppingList.some((i) => i.productId === productId)) {
        return state
      }
      const sizes = getSizesForProduct(productId)
      const preferred = getCurrentPrefs().size
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
```

- [ ] **Step 2: Typecheck**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

`npm run dev`. As Lena (size M), Discover and add an apparel product that offers size M; open Shopping and confirm size M is pre-selected. Add a product that has no M (e.g. a tent / shoe-sized item) and confirm it falls back to the first available size (no crash).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/store/useAppStore.ts
git commit -m "feat: default added items to the user's preferred size"
```

---

### Task 6: Favourite-colour highlight on product cards

**Files:**
- Modify: `frontend/src/components/ProductCard.tsx`
- Modify: `frontend/src/pages/DiscoverPage.tsx`

**Interfaces:**
- Consumes: `useCurrentUser` from Task 2.
- Produces: `ProductCard` gains optional prop `favouriteColor?: string`.

- [ ] **Step 1: Add the prop and highlight to ProductCard**

In `frontend/src/components/ProductCard.tsx`, extend the props interface and signature:

```tsx
interface ProductCardProps {
  product: Product
  onAdd?: (productId: string) => void
  added?: boolean
  favouriteColor?: string
}

export default function ProductCard({
  product,
  onAdd,
  added,
  favouriteColor,
}: ProductCardProps) {
  const discounted = product.discount_pct > 0
  const final = effectivePrice(product)
  const isFavColor =
    !!favouriteColor &&
    product.color.toLowerCase().includes(favouriteColor.toLowerCase())
```

Update the outer wrapper `className` so a favourite-colour match adds a ring (keep the existing discounted/border logic):

```tsx
    <div
      className={`flex flex-col rounded-xl bg-white p-4 shadow-sm ${
        discounted ? 'border-2 border-amber bg-amber/5' : 'border border-slate-bg'
      } ${isFavColor ? 'ring-2 ring-amber ring-offset-2' : ''}`}
    >
```

Add a small badge next to the colour line. Replace the existing colour line:

```tsx
      <p className="text-sm text-gray-500">
        {product.color}
        {isFavColor && (
          <span className="ml-2 rounded-full bg-amber/15 px-2 py-0.5 text-xs font-semibold text-amber-dark">
            ♥ your colour
          </span>
        )}
      </p>
```

- [ ] **Step 2: Pass the favourite colour from DiscoverPage**

In `frontend/src/pages/DiscoverPage.tsx`, add the import:

```tsx
import { useCurrentUser } from '../store/useUserStore'
```

Inside the component, read the current user near the other store hooks:

```tsx
  const current = useCurrentUser()
```

Pass it to each card in the results map:

```tsx
              <ProductCard
                key={product.product_id}
                product={product}
                onAdd={addToList}
                added={shoppingList.some(
                  (i) => i.productId === product.product_id,
                )}
                favouriteColor={current.prefs.favouriteColor}
              />
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual check**

`npm run dev`. As Lena (Teal), run a Discover search and confirm any Teal product shows the ring + "♥ your colour" badge. Switch to Marco (Orange) and re-run; the highlight should move to Orange products.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ProductCard.tsx frontend/src/pages/DiscoverPage.tsx
git commit -m "feat: highlight products matching the user's favourite colour"
```

---

### Task 7: Personalize the AI Discover prompt

**Files:**
- Modify: `frontend/src/lib/claude.ts:66-86`
- Modify: `frontend/src/pages/DiscoverPage.tsx`

**Interfaces:**
- Consumes: `useCurrentUser` (already imported in DiscoverPage from Task 6).
- Produces: `discoverProducts(userPrompt, catalogue, prefs?)` — new optional third arg `prefs?: { size?: string; favouriteColor?: string }`.

- [ ] **Step 1: Add the optional prefs argument**

In `frontend/src/lib/claude.ts`, change the `discoverProducts` signature and prepend a preference block to the user message:

```ts
export async function discoverProducts(
  userPrompt: string,
  catalogue: Product[],
  prefs?: { size?: string; favouriteColor?: string },
): Promise<string[]> {
  assertKey()

  const prefLines: string[] = []
  if (prefs?.size) {
    prefLines.push(
      `The shopper's clothing size is ${prefs.size}; prefer products that are available in that size.`,
    )
  }
  if (prefs?.favouriteColor) {
    prefLines.push(
      `The shopper's favourite colour is ${prefs.favouriteColor}; when two products are equally relevant, rank the one in or closest to that colour higher.`,
    )
  }
  const prefBlock = prefLines.length
    ? `\n\nShopper preferences:\n${prefLines.join('\n')}`
    : ''

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system:
      'You are a helpful outdoor gear advisor for a store. The user will describe what they need. You will receive a JSON catalogue of available products. Return ONLY a JSON array of product_ids that best match the user\'s need, ordered by relevance (discounted items should rank higher when relevance is equal). Return max 12 product_ids. Output only valid JSON, no explanation.',
    messages: [
      {
        role: 'user',
        content: `User need: ${userPrompt}${prefBlock}\n\nCatalogue: ${JSON.stringify(catalogue)}`,
      },
    ],
  })

  return extractStringArray(firstText(message)).slice(0, 12)
}
```

- [ ] **Step 2: Pass prefs from DiscoverPage**

In `frontend/src/pages/DiscoverPage.tsx`, update the `discoverProducts` call inside `handleSubmit` to pass the current prefs:

```tsx
      const ids = await discoverProducts(trimmed, getUniqueProducts(), current.prefs)
```

- [ ] **Step 3: Typecheck**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual check**

Requires `VITE_ANTHROPIC_API_KEY` set in `frontend/.env`. `npm run dev`. As Lena (M / Teal), run a generic search like "a warm jacket" and note the results; switch to Marco (L / Orange) and run the same search — the ordering should shift toward Marco's colour/size. (If no API key is set, this falls back to the existing "missing key" error, which is acceptable — the code path is still correct.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/claude.ts frontend/src/pages/DiscoverPage.tsx
git commit -m "feat: personalize AI Discover prompt with user preferences"
```

---

## Self-Review Notes

- **Spec coverage:** Two mock accounts (Task 2), account switching (Task 3), `/profile` view+edit (Task 4), persistence (Task 2 `persist`), size auto-select (Task 5), colour highlight (Task 6), AI personalization (Task 7), `getColors()` helper (Task 1). All spec sections mapped.
- **Type consistency:** `UserPrefs` / `Account` defined in Task 2 and reused by name in Tasks 3–7. `discoverProducts`'s third arg type matches `UserPrefs` shape. `favouriteColor` prop name consistent across Tasks 6 (ProductCard) and its caller.
- **Degradation:** Empty prefs → `addToList` uses `sizes[0]` (Task 5), no highlight (Task 6), no prompt block (Task 7) — identical to current behaviour.
