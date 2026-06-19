import Anthropic from '@anthropic-ai/sdk'
import type { Product } from '../types'

const MODEL = 'claude-sonnet-4-6'

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

const client = new Anthropic({
  apiKey,
  dangerouslyAllowBrowser: true,
})

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      'No Anthropic API key found. Copy .env.example to .env and set VITE_ANTHROPIC_API_KEY, then restart the dev server.',
    )
    this.name = 'MissingApiKeyError'
  }
}

function assertKey(): void {
  if (!apiKey) throw new MissingApiKeyError()
}

/** Pull the first text block out of a messages response. */
function firstText(message: Anthropic.Message): string {
  for (const block of message.content) {
    if (block.type === 'text') return block.text
  }
  return ''
}

/**
 * Robustly extract a JSON array of strings from a model reply that should be
 * "only JSON" but may carry stray prose or code fences.
 */
function extractStringArray(text: string): string[] {
  const tryParse = (s: string): string[] | null => {
    try {
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string')
      }
    } catch {
      /* fall through */
    }
    return null
  }

  const direct = tryParse(text.trim())
  if (direct) return direct

  const match = text.match(/\[[\s\S]*\]/)
  if (match) {
    const fromMatch = tryParse(match[0])
    if (fromMatch) return fromMatch
  }
  return []
}

/** Remove already-owned product ids from a list, preserving order. */
export function excludeOwned(ids: string[], owned: string[]): string[] {
  const ownedSet = new Set(owned)
  return ids.filter((id) => !ownedSet.has(id))
}

/**
 * Ask Claude which products best match the user's need.
 * Returns an ordered list of product_ids (max 12).
 */
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

/**
 * Ask Claude to compare a scanned product against a list item and give a
 * 2-sentence recommendation.
 */
export async function compareProducts(
  scanned: Product,
  listItem: Product,
): Promise<string> {
  assertKey()

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system:
      'You are a helpful gear advisor. Compare these two products for the user and give a 2-sentence recommendation on which to choose and why.',
    messages: [
      {
        role: 'user',
        content: `Scanned product: ${JSON.stringify(scanned)}\n\nProduct on my list: ${JSON.stringify(listItem)}`,
      },
    ],
  })

  return firstText(message).trim()
}

/**
 * Ask Claude for 3 promotional bundle / cross-sell ideas for the store owner.
 */
export async function suggestPromotions(
  discountedProducts: Product[],
): Promise<string> {
  assertKey()

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system:
      'Given this inventory, suggest 3 promotional bundles or cross-sell opportunities. Be concise, max 3 bullet points.',
    messages: [
      {
        role: 'user',
        content: `Inventory (discounted / notable items): ${JSON.stringify(discountedProducts)}`,
      },
    ],
  })

  return firstText(message).trim()
}
