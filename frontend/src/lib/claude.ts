import type { Product, SearchFilters } from '../types'
import { apiFetch } from '../api'

/**
 * Thrown when the server has no Anthropic API key configured (HTTP 503 from
 * /api/ai/*). The key now lives only on the backend — the browser never holds
 * it. Kept as a named error so the UI can show a setup-specific message.
 */
export class MissingApiKeyError extends Error {
  constructor(
    message = 'AI is not configured on the server. Set ANTHROPIC_API_KEY in the backend environment.',
  ) {
    super(message)
    this.name = 'MissingApiKeyError'
  }
}

/** POST JSON to a backend AI endpoint, surfacing the real error on failure. */
async function postAi<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
  } catch {
    throw new Error(
      'Could not reach the server. Check your connection and try again.',
    )
  }

  if (res.status === 503) {
    let detail: string | undefined
    try {
      detail = (await res.json())?.error
    } catch {
      /* ignore */
    }
    throw new MissingApiKeyError(detail)
  }

  if (!res.ok) {
    let detail = `AI request failed (${res.status})`
    let parsedError: string | undefined
    try {
      parsedError = (await res.json())?.error
    } catch {
      /* response body wasn't JSON — likely the static SPA, not the API */
    }
    if (parsedError) {
      detail = parsedError
    } else if (res.status === 404 || res.status === 405) {
      // The request reached the static site, not the backend API. In a Vercel
      // deploy the catch-all rewrite serves index.html for /api/*, which 405s
      // a POST; the fix is to point the frontend at the backend.
      detail =
        `AI backend not reachable (HTTP ${res.status}) — the request hit the static site instead of the API. ` +
        `Set VITE_API_URL to your backend URL for the deployment, or run the Django backend locally.`
    }
    throw new Error(detail)
  }

  return res.json() as Promise<T>
}

/** Remove already-owned product ids from a list, preserving order. */
export function excludeOwned(ids: string[], owned: string[]): string[] {
  const ownedSet = new Set(owned)
  return ids.filter((id) => !ownedSet.has(id))
}

/**
 * Convert a free-text shopping prompt into structured SearchFilters. The AI
 * call runs on the backend (key stays server-side); all subsequent filtering
 * is local.
 */
export async function parsePromptToFilters(
  prompt: string,
  availableTags: string[],
  availableCategories: string[],
  availableColors: string[],
): Promise<SearchFilters> {
  return postAi<SearchFilters>('/api/ai/discover/', {
    prompt,
    availableTags,
    availableCategories,
    availableColors,
  })
}

/**
 * Compare a scanned product against a list item and return a 2-sentence
 * recommendation.
 */
export async function compareProducts(
  scanned: Product,
  listItem: Product,
): Promise<string> {
  const { text } = await postAi<{ text: string }>('/api/ai/compare/', {
    scanned,
    listItem,
  })
  return text
}

/** Three promotional bundle / cross-sell ideas for the store owner. */
export async function suggestPromotions(
  discountedProducts: Product[],
): Promise<string> {
  const { text } = await postAi<{ text: string }>('/api/ai/promotions/', {
    products: discountedProducts,
  })
  return text
}
