import type { RecommendationReason } from '../types'

/** Per-kind colours; mirrors DiscountBadge's pill style for consistency. */
const KIND_CLASS: Record<RecommendationReason['kind'], string> = {
  'tag-match': 'bg-forest-50 text-forest',
  discount: 'bg-amber text-white',
  budget: 'bg-amber/15 text-amber-dark',
  color: 'bg-forest-50 text-forest',
  brand: 'bg-forest-50 text-forest',
  'in-stock-nearby': 'bg-forest-50 text-forest',
}

interface ReasonBadgeProps {
  reason: RecommendationReason
}

export default function ReasonBadge({ reason }: ReasonBadgeProps) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${
        KIND_CLASS[reason.kind]
      }`}
    >
      {reason.label}
    </span>
  )
}
