# Design: Remember purchases (don't re-suggest what I own)

Date: 2026-06-19
Status: Approved (pending spec review)

## Goal

Let a shopper mark products as "bought" so the AI Discover feature stops
recommending things they already own. Purchases are remembered across sessions
and devices by persisting them per user account in the Django backend.

## Scope decisions (from brainstorming)

- **What marks an item as bought:** an explicit **"Mark as bought"** button
  (not the existing check-off, not a bulk checkout).
- **How owned items affect Discover:** the owned `product_id`s are passed to
  Claude, which is instructed to **avoid recommending them but may suggest a
  better alternative when relevant** (not hard-filtered, not shown-and-flagged).
- **Persistence:** **backend database**, tied to **full user accounts** with
  login. Purchases follow the account across devices.

## Auth approach

Use **DRF Token Authentication** (`rest_framework.authtoken`, built into DRF —
no new dependency).

- Register/login return a token.
- Frontend stores the token in `localStorage` and sends
  `Authorization: Token <token>` on authenticated requests.
- Rejected alternatives: JWT (`simplejwt`) adds refresh-token complexity we
  don't need; session/cookie auth entangles with CSRF + CORS credentials.

## Architecture overview

```
React SPA (Vite)                       Django + DRF
─────────────────                      ─────────────
Auth screen ─┐                         /api/auth/register  ─┐
Zustand store│ token (localStorage)    /api/auth/login      │ Token auth
 ├ auth      ├──── Authorization ─────▶/api/auth/logout     │
 ├ purchases │      Token <token>      /api/purchases (CRUD) ┘
 └ shopping  │                              │
Discover ────┘                         Purchase model ── User (django.auth)
   │
   └─ owned product_ids ──▶ discoverProducts() ──▶ Claude (avoid-owned prompt)
```

## Backend

### Settings (`backend/backend/settings.py`)
- Add `'rest_framework.authtoken'` to `INSTALLED_APPS`.
- Add DRF config:
  ```python
  REST_FRAMEWORK = {
      'DEFAULT_AUTHENTICATION_CLASSES': [
          'rest_framework.authentication.TokenAuthentication',
      ],
      'DEFAULT_PERMISSION_CLASSES': [
          'rest_framework.permissions.IsAuthenticated',
      ],
  }
  ```
  The existing `health` endpoint is made `AllowAny` explicitly so it stays
  public.

### Model (`backend/api/models.py`)
```python
class Purchase(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    product_id = models.CharField(max_length=64)
    bought_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product_id')
        ordering = ['-bought_at']
```
- `product_id` is the catalogue id string (matches `products.json` / the
  frontend `Product.product_id`). The backend does **not** need the full
  catalogue — it only stores ids.
- Migration committed with the change.

### Endpoints (`backend/api/urls.py`, `views.py`)
All under the existing `/api/` prefix.

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| POST | `/api/auth/register/` | public | body `{username, password}`; create user, return `{token, username}`. 400 if username taken / invalid. |
| POST | `/api/auth/login/`    | public | body `{username, password}`; return `{token, username}`. 400 on bad credentials. |
| POST | `/api/auth/logout/`   | token  | delete the caller's token; 204. |
| GET  | `/api/purchases/`     | token  | return `{product_ids: [...]}` for the current user. |
| POST | `/api/purchases/`     | token  | body `{product_id}`; idempotent create (get_or_create); return `{product_ids: [...]}`. |
| DELETE | `/api/purchases/<product_id>/` | token | remove that purchase; return `{product_ids: [...]}`. 204/200 even if absent (idempotent). |

Notes:
- Register/login use Django's auth (`User.objects.create_user`,
  `authenticate`) and `Token.objects.get_or_create`.
- Username is used as the account identifier (no email/verification — keeps
  scope tight for a hackathon). Password runs through Django's validators.
- Purchase list responses return the simple `{product_ids: [...]}` shape the
  frontend consumes directly.

## Frontend

### API client (`frontend/src/api.js`)
- Extend `apiFetch` to accept/attach the `Authorization: Token` header when a
  token is present, and default `Content-Type: application/json`.
- Add a small helper to detect 401 → triggers auth reset.

### Store (`frontend/src/store/useAppStore.ts`)
Add to `AppState`:
- `token: string | null`, `username: string | null` — hydrated from
  `localStorage` on init, written on login/logout.
- `purchases: string[]` — owned `product_id`s.
- Actions: `register(username, password)`, `login(username, password)`,
  `logout()`, `loadPurchases()`, `markAsBought(productId)`,
  `unmarkBought(productId)`.
- `markAsBought` is optimistic: update local `purchases` immediately, POST,
  roll back on failure.
- On login/app-load with a token, call `loadPurchases()`.
- `logout()` clears token, username, purchases from state and `localStorage`,
  and best-effort calls the logout endpoint.

### Auth UI
- A **Login / Register screen** (toggle between the two modes) with username,
  password, inline error display.
- `NavBar` shows the logged-in username + a Logout button when authenticated.
- Gating: the app is usable for browsing/Discover, but **"Mark as bought"** and
  loading purchase history require being logged in. If a logged-out user clicks
  "Mark as bought", prompt them to log in. (Discover still works logged-out; it
  just won't have an owned-list to avoid.)

### "Mark as bought" control
- Add a **"Mark as bought"** button to the shopping list item
  (`ShoppingList.tsx`) and to `ProductCard.tsx`.
- When a product is already owned, the control shows an owned state
  ("Bought ✓") and offers an **undo** (calls `unmarkBought`).

### Discover integration
- `DiscoverPage` reads `purchases` from the store and passes them into
  `discoverProducts(prompt, catalogue, ownedIds)`.
- `discoverProducts` (`lib/claude.ts`) gains an `ownedIds: string[]` param. The
  system prompt is updated to instruct Claude to **avoid recommending products
  whose ids are in the owned list, but it may suggest a better alternative when
  genuinely relevant**. The owned ids are included in the user message.
- As a safety net, if Claude still returns an owned id, the frontend keeps it
  out of results (belt-and-suspenders so an owned item never appears).

## Error handling

- **Auth errors** (bad login, duplicate username, weak password): surfaced
  inline on the auth form from the backend's 400 message.
- **Network errors**: inline error message; actions remain retryable.
- **401 on any authenticated request**: clear auth state + token from
  `localStorage`, send the user to the login screen.
- **Mark-as-bought failure**: optimistic update rolls back; show a brief error.

## Testing

### Backend (`backend/api/tests.py`)
- Register creates a user and returns a token; duplicate username → 400.
- Login returns a token for valid credentials; bad credentials → 400.
- Authenticated `POST /api/purchases/` creates a purchase; repeat is idempotent
  (no duplicate, unique constraint holds).
- `GET /api/purchases/` returns only the calling user's ids.
- `DELETE /api/purchases/<id>/` removes it; idempotent if absent.
- Unauthenticated access to purchase endpoints → 401.

### Frontend
- Store: `markAsBought` optimistic add + rollback on rejected POST.
- Store: `logout` clears token/purchases and `localStorage`.
- Discover: owned ids are passed to `discoverProducts` and any owned id returned
  by the model is filtered out of final results.

## Out of scope (YAGNI)

- Email/password reset/verification, OAuth/social login.
- Quantities, purchase dates UI, order history page.
- Cross-user/shared catalogues, admin management of purchases.
- Syncing the existing in-memory shopping list to the backend (only purchases
  are persisted; the shopping list stays client-side as today).
