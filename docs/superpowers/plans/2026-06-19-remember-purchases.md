# Remember Purchases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in shopper mark products as "bought" so the AI Discover feature stops recommending things they already own, with purchases persisted per user account in the Django backend.

**Architecture:** Django REST Framework Token authentication backs user accounts and a `Purchase` table (one row per owned `product_id` per user). A React SPA stores the auth token in `localStorage`, loads the user's purchases on login, exposes a "Mark as bought" button, and passes owned ids into the Claude Discover call so the model avoids re-recommending them (with a client-side safety filter).

**Tech Stack:** Django 5.2 + DRF (TokenAuthentication), SQLite (dev). React 19 + TypeScript + Zustand + react-router-dom + Vite. Vitest + jsdom for frontend tests.

## Global Constraints

- Backend uses **DRF Token Authentication only** (`rest_framework.authtoken`) — no new pip dependency, no JWT, no session/cookie auth.
- Purchase rows store only the catalogue `product_id` string (max length 64); the backend never holds the product catalogue.
- All API paths live under the existing `/api/` prefix.
- Purchase list responses always use the shape `{"product_ids": [...]}`.
- Frontend token is stored in `localStorage` under key `"token"`; username under key `"username"`.
- Authenticated requests send header `Authorization: Token <token>`.
- A 401 on any authenticated request clears local auth state.
- The existing in-memory shopping list stays client-side and is NOT persisted (only purchases are).
- Discover keeps working when logged out (it just has no owned-list to avoid).

---

## File Structure

**Backend (create/modify):**
- `backend/backend/settings.py` — add `authtoken` app + `REST_FRAMEWORK` config
- `backend/api/models.py` — `Purchase` model
- `backend/api/migrations/0001_initial.py` — generated migration
- `backend/api/views.py` — auth + purchases views
- `backend/api/urls.py` — routes
- `backend/api/tests.py` — backend tests

**Frontend (create/modify):**
- `frontend/vite.config.ts` — add `/api` dev proxy + vitest config
- `frontend/package.json` — add `vitest`, `jsdom`, `test` script
- `frontend/src/api.js` — attach auth header
- `frontend/src/store/useAppStore.ts` — auth + purchases state/actions
- `frontend/src/store/useAppStore.test.ts` — store tests
- `frontend/src/pages/AuthPage.tsx` — login/register screen (create)
- `frontend/src/App.tsx` — route for `/auth`
- `frontend/src/components/NavBar.tsx` — account state (login/logout)
- `frontend/src/components/ShoppingList.tsx` — "Mark as bought" control
- `frontend/src/components/ProductCard.tsx` — owned state + "Mark as bought"
- `frontend/src/lib/claude.ts` — `ownedIds` param + `excludeOwned` helper
- `frontend/src/lib/claude.test.ts` — `excludeOwned` test
- `frontend/src/pages/DiscoverPage.tsx` — pass owned ids into Discover

---

## Task 1: Backend — auth config + Purchase model

**Files:**
- Modify: `backend/backend/settings.py:33-43` (INSTALLED_APPS) and append `REST_FRAMEWORK`
- Modify: `backend/api/models.py`
- Create: `backend/api/migrations/0001_initial.py` (via makemigrations)
- Test: `backend/api/tests.py`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `Purchase` model with fields `user` (FK to `auth.User`, related_name `purchases`), `product_id` (CharField max_length=64), `bought_at` (auto_now_add DateTimeField); `unique_together = ('user', 'product_id')`. DRF defaults: `TokenAuthentication` + `IsAuthenticated`.

- [ ] **Step 1: Write the failing test**

Create `backend/api/tests.py`:

```python
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.test import TestCase

from api.models import Purchase


class PurchaseModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pw-strong-123")

    def test_create_purchase(self):
        p = Purchase.objects.create(user=self.user, product_id="P100")
        self.assertEqual(p.product_id, "P100")
        self.assertIsNotNone(p.bought_at)
        self.assertEqual(list(self.user.purchases.values_list("product_id", flat=True)), ["P100"])

    def test_duplicate_purchase_rejected(self):
        Purchase.objects.create(user=self.user, product_id="P100")
        with self.assertRaises(IntegrityError):
            Purchase.objects.create(user=self.user, product_id="P100")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python manage.py test api -v 2`
Expected: FAIL — `ImportError`/`cannot import name 'Purchase'` (model doesn't exist yet).

- [ ] **Step 3: Write the model**

Replace `backend/api/models.py` with:

```python
from django.contrib.auth.models import User
from django.db import models


class Purchase(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="purchases")
    product_id = models.CharField(max_length=64)
    bought_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "product_id")
        ordering = ["-bought_at"]

    def __str__(self):
        return f"{self.user.username}:{self.product_id}"
```

- [ ] **Step 4: Add auth config to settings**

In `backend/backend/settings.py`, add `'rest_framework.authtoken',` to `INSTALLED_APPS` (right after `'rest_framework',`), and append at the end of the file:

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}
```

- [ ] **Step 5: Generate the migration**

Run: `cd backend && python manage.py makemigrations api`
Expected: creates `api/migrations/0001_initial.py` with the `Purchase` model.

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && python manage.py test api -v 2`
Expected: PASS (2 tests). Migrations for `authtoken` apply automatically in the test DB.

- [ ] **Step 7: Commit**

```bash
git add backend/api/models.py backend/api/migrations/0001_initial.py backend/backend/settings.py backend/api/tests.py
git commit -m "feat(backend): add Purchase model and DRF token auth config"
```

---

## Task 2: Backend — auth endpoints (register/login/logout)

**Files:**
- Modify: `backend/api/views.py`
- Modify: `backend/api/urls.py`
- Test: `backend/api/tests.py`

**Interfaces:**
- Consumes: `Purchase` model, DRF defaults from Task 1.
- Produces: routes `POST /api/auth/register/`, `POST /api/auth/login/`, `POST /api/auth/logout/`. Register/login return `{"token": str, "username": str}` (register → 201, login → 200). Errors return `{"error": str}` with status 400. Logout returns 204.

- [ ] **Step 1: Write the failing tests**

Append to `backend/api/tests.py`:

```python
from rest_framework.test import APIClient


class AuthEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_returns_token(self):
        res = self.client.post(
            "/api/auth/register/",
            {"username": "bob", "password": "pw-strong-123"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn("token", res.data)
        self.assertEqual(res.data["username"], "bob")

    def test_register_duplicate_username_rejected(self):
        User.objects.create_user(username="bob", password="pw-strong-123")
        res = self.client.post(
            "/api/auth/register/",
            {"username": "bob", "password": "pw-strong-123"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("error", res.data)

    def test_login_valid_credentials(self):
        User.objects.create_user(username="carol", password="pw-strong-123")
        res = self.client.post(
            "/api/auth/login/",
            {"username": "carol", "password": "pw-strong-123"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("token", res.data)

    def test_login_bad_credentials_rejected(self):
        User.objects.create_user(username="carol", password="pw-strong-123")
        res = self.client.post(
            "/api/auth/login/",
            {"username": "carol", "password": "wrong"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_logout_deletes_token(self):
        User.objects.create_user(username="dave", password="pw-strong-123")
        login = self.client.post(
            "/api/auth/login/",
            {"username": "dave", "password": "pw-strong-123"},
            format="json",
        )
        token = login.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        res = self.client.post("/api/auth/logout/")
        self.assertEqual(res.status_code, 204)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python manage.py test api.tests.AuthEndpointTests -v 2`
Expected: FAIL — 404 (routes not defined).

- [ ] **Step 3: Write the views**

Replace `backend/api/views.py` with:

```python
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Purchase


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok"})


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    if not username or not password:
        return Response({"error": "Username and password are required."}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"error": "That username is already taken."}, status=400)
    try:
        validate_password(password)
    except ValidationError as exc:
        return Response({"error": " ".join(exc.messages)}, status=400)
    user = User.objects.create_user(username=username, password=password)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "username": user.username}, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    user = authenticate(username=username, password=password)
    if user is None:
        return Response({"error": "Invalid username or password."}, status=400)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "username": user.username})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response(status=204)
```

- [ ] **Step 4: Wire the routes**

Replace `backend/api/urls.py` with:

```python
from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("auth/register/", views.register, name="register"),
    path("auth/login/", views.login, name="login"),
    path("auth/logout/", views.logout, name="logout"),
]
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python manage.py test api.tests.AuthEndpointTests -v 2`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/api/views.py backend/api/urls.py backend/api/tests.py
git commit -m "feat(backend): add register/login/logout endpoints"
```

---

## Task 3: Backend — purchases endpoints

**Files:**
- Modify: `backend/api/views.py`
- Modify: `backend/api/urls.py`
- Test: `backend/api/tests.py`

**Interfaces:**
- Consumes: `Purchase` model, auth views from Task 2.
- Produces: `GET /api/purchases/` → `{"product_ids": [...]}`; `POST /api/purchases/` with body `{"product_id": str}` (idempotent) → `{"product_ids": [...]}`; `DELETE /api/purchases/<product_id>/` (idempotent) → `{"product_ids": [...]}`. All require auth (401 otherwise).

- [ ] **Step 1: Write the failing tests**

Append to `backend/api/tests.py`:

```python
class PurchaseEndpointTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="erin", password="pw-strong-123")
        login = self.client.post(
            "/api/auth/login/",
            {"username": "erin", "password": "pw-strong-123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")

    def test_requires_auth(self):
        anon = APIClient()
        self.assertEqual(anon.get("/api/purchases/").status_code, 401)

    def test_post_creates_and_lists(self):
        res = self.client.post("/api/purchases/", {"product_id": "P1"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["product_ids"], ["P1"])

    def test_post_is_idempotent(self):
        self.client.post("/api/purchases/", {"product_id": "P1"}, format="json")
        res = self.client.post("/api/purchases/", {"product_id": "P1"}, format="json")
        self.assertEqual(res.data["product_ids"], ["P1"])
        self.assertEqual(Purchase.objects.filter(user=self.user).count(), 1)

    def test_list_is_user_scoped(self):
        other = User.objects.create_user(username="frank", password="pw-strong-123")
        Purchase.objects.create(user=other, product_id="OTHER")
        self.client.post("/api/purchases/", {"product_id": "MINE"}, format="json")
        res = self.client.get("/api/purchases/")
        self.assertEqual(res.data["product_ids"], ["MINE"])

    def test_delete_removes_and_is_idempotent(self):
        self.client.post("/api/purchases/", {"product_id": "P1"}, format="json")
        res = self.client.delete("/api/purchases/P1/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["product_ids"], [])
        # deleting again is fine
        res2 = self.client.delete("/api/purchases/P1/")
        self.assertEqual(res2.status_code, 200)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python manage.py test api.tests.PurchaseEndpointTests -v 2`
Expected: FAIL — 404 on `/api/purchases/`.

- [ ] **Step 3: Add the views**

Append to `backend/api/views.py`:

```python
def _product_ids(user):
    return list(user.purchases.values_list("product_id", flat=True))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def purchases(request):
    if request.method == "POST":
        product_id = (request.data.get("product_id") or "").strip()
        if not product_id:
            return Response({"error": "product_id is required."}, status=400)
        Purchase.objects.get_or_create(user=request.user, product_id=product_id)
    return Response({"product_ids": _product_ids(request.user)})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def purchase_detail(request, product_id):
    Purchase.objects.filter(user=request.user, product_id=product_id).delete()
    return Response({"product_ids": _product_ids(request.user)})
```

- [ ] **Step 4: Wire the routes**

In `backend/api/urls.py`, add these two entries to `urlpatterns`:

```python
    path("purchases/", views.purchases, name="purchases"),
    path("purchases/<str:product_id>/", views.purchase_detail, name="purchase-detail"),
```

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && python manage.py test api -v 2`
Expected: PASS (all tests from Tasks 1–3).

- [ ] **Step 6: Commit**

```bash
git add backend/api/views.py backend/api/urls.py backend/api/tests.py
git commit -m "feat(backend): add purchases list/create/delete endpoints"
```

---

## Task 4: Frontend — test runner, dev proxy, auth-aware API client

**Files:**
- Modify: `frontend/package.json` (devDeps + `test` script)
- Modify: `frontend/vite.config.ts` (proxy + vitest config)
- Modify: `frontend/src/api.js`
- Test: `frontend/src/api.test.js`

**Interfaces:**
- Consumes: nothing frontend-specific yet.
- Produces: `apiFetch(path, options?)` attaches `Authorization: Token <token>` from `localStorage` when present and defaults `Content-Type: application/json`. Vitest runs via `npm run test` with jsdom. Dev server proxies `/api` → `http://localhost:8000`.

- [ ] **Step 1: Install test deps**

Run: `cd frontend && npm install -D vitest@^2 jsdom@^25`
Expected: adds `vitest` and `jsdom` to `devDependencies`.

- [ ] **Step 2: Add the test script**

In `frontend/package.json`, add to `"scripts"`:

```json
    "test": "vitest run"
```

- [ ] **Step 3: Configure proxy + vitest**

Replace `frontend/vite.config.ts` with:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: Write the failing test**

Create `frontend/src/api.test.js`:

```js
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('apiFetch', () => {
  it('attaches the auth token header when present', async () => {
    localStorage.setItem('token', 'abc123')
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    await apiFetch('/api/purchases/')
    const [, options] = spy.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Token abc123')
    expect(options.headers['Content-Type']).toBe('application/json')
  })

  it('omits the auth header when no token', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'))
    await apiFetch('/api/health/')
    const [, options] = spy.mock.calls[0]
    expect(options.headers['Authorization']).toBeUndefined()
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/api.test.js`
Expected: FAIL — `apiFetch` does not set headers yet.

- [ ] **Step 6: Update the API client**

Replace `frontend/src/api.js` with:

```js
// API base: empty in dev (Vite proxies /api -> Django), set to the Railway
// backend URL in production via VITE_API_URL.
const API_BASE = import.meta.env.VITE_API_URL ?? ''

export function apiUrl(path) {
  return `${API_BASE}${path}`
}

export function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) {
    headers['Authorization'] = `Token ${token}`
  }
  return fetch(apiUrl(path), { ...options, headers })
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd frontend && npm run test -- src/api.test.js`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/src/api.js frontend/src/api.test.js
git commit -m "feat(frontend): add vitest, api proxy, and auth-aware apiFetch"
```

---

## Task 5: Frontend — auth + purchases store

**Files:**
- Modify: `frontend/src/store/useAppStore.ts`
- Test: `frontend/src/store/useAppStore.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from Task 4; backend endpoints from Tasks 2–3.
- Produces, added to `AppState`:
  - `token: string | null`, `username: string | null`, `purchases: string[]`, `authError: string | null`
  - `register(username: string, password: string): Promise<boolean>`
  - `login(username: string, password: string): Promise<boolean>`
  - `logout(): void`
  - `loadPurchases(): Promise<void>`
  - `markAsBought(productId: string): Promise<void>` (optimistic, rolls back on failure)
  - `unmarkBought(productId: string): Promise<void>`
  - `isOwned(productId: string): boolean` is NOT added; consumers read `purchases.includes(id)` directly.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/store/useAppStore.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from './useAppStore'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState({
    token: null,
    username: null,
    purchases: [],
    authError: null,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('login', () => {
  it('stores token + username and persists them on success', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ token: 't1', username: 'amy' }))
      .mockResolvedValueOnce(jsonResponse({ product_ids: ['P1'] }))

    const ok = await useAppStore.getState().login('amy', 'pw')

    expect(ok).toBe(true)
    expect(useAppStore.getState().token).toBe('t1')
    expect(useAppStore.getState().username).toBe('amy')
    expect(localStorage.getItem('token')).toBe('t1')
    expect(useAppStore.getState().purchases).toEqual(['P1'])
  })

  it('sets authError and returns false on bad credentials', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({ error: 'Invalid username or password.' }, 400),
    )

    const ok = await useAppStore.getState().login('amy', 'wrong')

    expect(ok).toBe(false)
    expect(useAppStore.getState().token).toBeNull()
    expect(useAppStore.getState().authError).toBe('Invalid username or password.')
  })
})

describe('logout', () => {
  it('clears auth state and localStorage', () => {
    useAppStore.setState({ token: 't1', username: 'amy', purchases: ['P1'] })
    localStorage.setItem('token', 't1')
    localStorage.setItem('username', 'amy')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    useAppStore.getState().logout()

    expect(useAppStore.getState().token).toBeNull()
    expect(useAppStore.getState().purchases).toEqual([])
    expect(localStorage.getItem('token')).toBeNull()
  })
})

describe('markAsBought', () => {
  it('optimistically adds then keeps the id on success', async () => {
    useAppStore.setState({ token: 't1', username: 'amy' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ product_ids: ['P1'] }),
    )

    await useAppStore.getState().markAsBought('P1')

    expect(useAppStore.getState().purchases).toEqual(['P1'])
  })

  it('rolls back the optimistic add on failure', async () => {
    useAppStore.setState({ token: 't1', username: 'amy', purchases: [] })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('err', { status: 500 }))

    await useAppStore.getState().markAsBought('P1')

    expect(useAppStore.getState().purchases).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm run test -- src/store/useAppStore.test.ts`
Expected: FAIL — properties/actions undefined.

- [ ] **Step 3: Extend the store**

Edit `frontend/src/store/useAppStore.ts`. Add the import at the top:

```ts
import { apiFetch } from '../api'
```

Extend the `AppState` interface with:

```ts
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
```

Inside `create<AppState>((set, get) => ({ ... }))` — note `set` becomes `set, get` — add these initial values and actions alongside the existing ones:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm run test -- src/store/useAppStore.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store/useAppStore.ts frontend/src/store/useAppStore.test.ts
git commit -m "feat(frontend): add auth + purchases state to the store"
```

---

## Task 6: Frontend — auth screen + nav account state

**Files:**
- Create: `frontend/src/pages/AuthPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/NavBar.tsx`

**Interfaces:**
- Consumes: store `register`, `login`, `logout`, `token`, `username`, `authError` from Task 5.
- Produces: route `/auth` rendering `AuthPage`; NavBar shows username + Logout when `token` is set, otherwise a "Log in" link to `/auth`. On successful login/register, `AuthPage` navigates to `/`.

- [ ] **Step 1: Create the auth page**

Create `frontend/src/pages/AuthPage.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export default function AuthPage() {
  const navigate = useNavigate()
  const register = useAppStore((s) => s.register)
  const login = useAppStore((s) => s.login)
  const authError = useAppStore((s) => s.authError)

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    const ok =
      mode === 'login'
        ? await login(username, password)
        : await register(username, password)
    setSubmitting(false)
    if (ok) navigate('/')
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-bg">
        <h1 className="text-xl font-bold text-gray-900">
          {mode === 'login' ? 'Log in' : 'Create an account'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {mode === 'login'
            ? 'Log in to track what you already own.'
            : 'Sign up so we never suggest gear you already have.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
          <input
            type="text"
            autoComplete="username"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-forest focus:outline-none"
          />
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-forest focus:outline-none"
          />

          {authError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="rounded-xl bg-forest px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? 'Please wait…'
              : mode === 'login'
                ? 'Log in'
                : 'Sign up'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-4 w-full text-center text-sm font-medium text-forest hover:underline"
        >
          {mode === 'login'
            ? "Don't have an account? Sign up"
            : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the route**

In `frontend/src/App.tsx`, import the page and add the route:

```tsx
import AuthPage from './pages/AuthPage'
```

Add inside `<Routes>`:

```tsx
          <Route path="/auth" element={<AuthPage />} />
```

- [ ] **Step 3: Show account state in the nav**

In `frontend/src/components/NavBar.tsx`, add to the imports:

```tsx
import { useNavigate } from 'react-router-dom'
```

Inside `NavBar()`, after the `listCount` line, add:

```tsx
  const navigate = useNavigate()
  const username = useAppStore((s) => s.username)
  const token = useAppStore((s) => s.token)
  const logout = useAppStore((s) => s.logout)
```

Then, inside the `<div className="flex items-center gap-1">` after the Admin `NavLink`, add:

```tsx
          {token ? (
            <div className="ml-2 flex items-center gap-2">
              <span className="text-sm text-forest-50">{username}</span>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/auth')
                }}
                className="rounded-full px-3 py-2 text-sm font-semibold text-forest-50 transition-colors hover:bg-forest-light hover:text-white"
              >
                Log out
              </button>
            </div>
          ) : (
            <NavLink to="/auth" className={linkClass}>
              Log in
            </NavLink>
          )}
```

- [ ] **Step 4: Verify the build typechecks**

Run: `cd frontend && npm run build`
Expected: build succeeds (no TypeScript errors).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AuthPage.tsx frontend/src/App.tsx frontend/src/components/NavBar.tsx
git commit -m "feat(frontend): add login/register screen and nav account state"
```

---

## Task 7: Frontend — "Mark as bought" controls

**Files:**
- Modify: `frontend/src/components/ProductCard.tsx`
- Modify: `frontend/src/components/ShoppingList.tsx`

**Interfaces:**
- Consumes: store `purchases`, `markAsBought`, `unmarkBought`, `token` from Task 5.
- Produces: `ProductCard` gains optional props `owned?: boolean`, `onMarkBought?: (productId: string) => void`, `onUnmarkBought?: (productId: string) => void`. When `owned` is true the card shows a "Bought ✓ — Undo" control; when false (and the handler is provided) it shows "Mark as bought". `ShoppingList` shows the same control per item, gated on being logged in.

- [ ] **Step 1: Extend ProductCard**

In `frontend/src/components/ProductCard.tsx`, update the props interface:

```tsx
interface ProductCardProps {
  product: Product
  onAdd?: (productId: string) => void
  added?: boolean
  owned?: boolean
  onMarkBought?: (productId: string) => void
  onUnmarkBought?: (productId: string) => void
}
```

Update the destructure:

```tsx
export default function ProductCard({
  product,
  onAdd,
  added,
  owned,
  onMarkBought,
  onUnmarkBought,
}: ProductCardProps) {
```

After the existing `onAdd` button block (after the closing `)}` of `{onAdd && (...)}`), add:

```tsx
      {owned ? (
        <button
          type="button"
          onClick={() => onUnmarkBought?.(product.product_id)}
          className="mt-2 w-full rounded-xl bg-forest-50 px-4 py-2 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
        >
          ✓ Bought — tap to undo
        </button>
      ) : (
        onMarkBought && (
          <button
            type="button"
            onClick={() => onMarkBought(product.product_id)}
            className="mt-2 w-full rounded-xl border border-forest px-4 py-2 text-sm font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
          >
            Mark as bought
          </button>
        )
      )}
```

- [ ] **Step 2: Add the control to the shopping list**

In `frontend/src/components/ShoppingList.tsx`, extend the store selectors at the top of the component:

```tsx
  const token = useAppStore((s) => s.token)
  const purchases = useAppStore((s) => s.purchases)
  const markAsBought = useAppStore((s) => s.markAsBought)
  const unmarkBought = useAppStore((s) => s.unmarkBought)
```

Inside the `.map`, after the `<p className="mt-2 text-sm text-gray-600">Find it in Zone ...</p>` line (still inside the `min-w-0 flex-1` div), add:

```tsx
              {token &&
                (purchases.includes(item.productId) ? (
                  <button
                    type="button"
                    onClick={() => unmarkBought(item.productId)}
                    className="mt-2 rounded-lg bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
                  >
                    ✓ Bought — undo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => markAsBought(item.productId)}
                    className="mt-2 rounded-lg border border-forest px-3 py-1.5 text-xs font-semibold text-forest transition-colors hover:bg-forest hover:text-white"
                  >
                    Mark as bought
                  </button>
                ))}
```

- [ ] **Step 3: Verify the build typechecks**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ProductCard.tsx frontend/src/components/ShoppingList.tsx
git commit -m "feat(frontend): add Mark as bought controls to list and cards"
```

---

## Task 8: Frontend — Discover avoids owned items

**Files:**
- Modify: `frontend/src/lib/claude.ts`
- Create: `frontend/src/lib/claude.test.ts`
- Modify: `frontend/src/pages/DiscoverPage.tsx`

**Interfaces:**
- Consumes: store `purchases`, `markAsBought`, `unmarkBought`, `token` from Task 5; `excludeOwned` (new, this task).
- Produces:
  - `excludeOwned(ids: string[], owned: string[]): string[]` — pure helper, exported from `claude.ts`, returns `ids` with any member of `owned` removed (order preserved).
  - `discoverProducts(userPrompt: string, catalogue: Product[], ownedIds?: string[]): Promise<string[]>` — owned ids are named in the system prompt as "do not recommend" and the returned ids are passed through `excludeOwned` as a safety net.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/claude.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { excludeOwned } from './claude'

describe('excludeOwned', () => {
  it('removes owned ids while preserving order', () => {
    expect(excludeOwned(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c'])
  })

  it('returns all ids when nothing is owned', () => {
    expect(excludeOwned(['a', 'b'], [])).toEqual(['a', 'b'])
  })

  it('returns empty when everything is owned', () => {
    expect(excludeOwned(['a', 'b'], ['a', 'b'])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test -- src/lib/claude.test.ts`
Expected: FAIL — `excludeOwned` is not exported.

- [ ] **Step 3: Update claude.ts**

In `frontend/src/lib/claude.ts`, add the exported helper (e.g. just below the `extractStringArray` function):

```ts
/** Remove already-owned product ids from a list, preserving order. */
export function excludeOwned(ids: string[], owned: string[]): string[] {
  const ownedSet = new Set(owned)
  return ids.filter((id) => !ownedSet.has(id))
}
```

Then replace the `discoverProducts` function with this version (adds the `ownedIds` param, prompt instruction, and safety filter):

```ts
export async function discoverProducts(
  userPrompt: string,
  catalogue: Product[],
  ownedIds: string[] = [],
): Promise<string[]> {
  assertKey()

  const ownedNote =
    ownedIds.length > 0
      ? ` The user ALREADY OWNS these product_ids and you must NOT recommend them: ${JSON.stringify(
          ownedIds,
        )}. If an owned item would have been the best match, recommend a genuinely better or complementary alternative from the catalogue instead.`
      : ''

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system:
      'You are a helpful outdoor gear advisor for a store. The user will describe what they need. You will receive a JSON catalogue of available products. Return ONLY a JSON array of product_ids that best match the user\'s need, ordered by relevance (discounted items should rank higher when relevance is equal). Return max 12 product_ids. Output only valid JSON, no explanation.' +
      ownedNote,
    messages: [
      {
        role: 'user',
        content: `User need: ${userPrompt}\n\nCatalogue: ${JSON.stringify(catalogue)}`,
      },
    ],
  })

  const ids = extractStringArray(firstText(message)).slice(0, 12)
  return excludeOwned(ids, ownedIds)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test -- src/lib/claude.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire DiscoverPage to pass owned ids + show owned/bought controls**

In `frontend/src/pages/DiscoverPage.tsx`:

Add store selectors next to the existing `addToList`/`shoppingList` ones:

```tsx
  const purchases = useAppStore((s) => s.purchases)
  const token = useAppStore((s) => s.token)
  const markAsBought = useAppStore((s) => s.markAsBought)
  const unmarkBought = useAppStore((s) => s.unmarkBought)
```

Change the `discoverProducts` call to pass owned ids:

```tsx
      const ids = await discoverProducts(trimmed, getUniqueProducts(), purchases)
```

Update the `<ProductCard>` usage in the results grid to pass the new props:

```tsx
              <ProductCard
                key={product.product_id}
                product={product}
                onAdd={addToList}
                added={shoppingList.some(
                  (i) => i.productId === product.product_id,
                )}
                owned={purchases.includes(product.product_id)}
                onMarkBought={token ? markAsBought : undefined}
                onUnmarkBought={token ? unmarkBought : undefined}
              />
```

- [ ] **Step 6: Run the full frontend suite + build**

Run: `cd frontend && npm run test && npm run build`
Expected: all tests PASS and the build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/claude.ts frontend/src/lib/claude.test.ts frontend/src/pages/DiscoverPage.tsx
git commit -m "feat(frontend): Discover avoids already-owned products"
```

---

## Final verification

- [ ] **Backend:** `cd backend && python manage.py test api -v 2` → all PASS
- [ ] **Frontend:** `cd frontend && npm run test` → all PASS
- [ ] **Frontend build:** `cd frontend && npm run build` → succeeds
- [ ] **Manual smoke (optional):** run `python manage.py migrate` then `python manage.py runserver` (backend) and `npm run dev` (frontend); register a user, mark a product bought, then run a Discover search and confirm the owned product is not recommended.

---

## Spec coverage check

- Explicit "Mark as bought" button → Task 7 (list + card controls).
- Owned items passed to Claude with avoid-but-suggest-alternative instruction → Task 8 (`discoverProducts` prompt + `excludeOwned` safety net).
- Backend DB persistence → Tasks 1–3 (`Purchase` model + endpoints).
- Full user accounts / login → Tasks 2 (auth endpoints), 5 (store), 6 (auth UI).
- DRF Token Authentication → Task 1 (config), used throughout.
- Error handling (inline auth errors, 401 → logout, optimistic rollback) → Tasks 5–6.
- Testing (backend auth/purchase enforcement; frontend store + filter) → Tasks 1–5, 8.
- Out-of-scope items (no shopping-list sync, no email/OAuth) → respected; not implemented.
