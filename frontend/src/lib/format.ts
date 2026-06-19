// Display helpers.

const ACRONYMS = new Set(['3l', 'uv', 'led'])

/**
 * Turn a category slug like "approach-shoes" or "insulated-jacket" into a
 * clean, human label like "Approach Shoes". A few acronyms stay upper-case.
 */
export function formatCategory(slug: string): string {
  if (!slug) return '—'
  return slug
    .split('-')
    .map((word) =>
      ACRONYMS.has(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}
