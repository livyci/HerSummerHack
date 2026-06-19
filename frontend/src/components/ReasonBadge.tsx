import type { RecommendationReason } from '../types'

/** Per-kind colours; mirrors DiscountBadge's pill style for consistency. */
const KIND_CLASS: Record<RecommendationReason['kind'], string> = {
  'tag-match': 'bg-forest text-white',
  discount: 'bg-amber text-white',
  budget: 'bg-forest-50 text-forest',
  color: 'bg-forest-50 text-forest',
  brand: 'bg-forest-50 text-forest',
  'in-stock-nearby': 'bg-forest-light text-white',
}

interface ReasonBadgeProps {
  reason: RecommendationReason
}

export default function ReasonBadge({ reason }: ReasonBadgeProps) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
        KIND_CLASS[reason.kind]
      }`}
    >
      {reason.label}
    </span>
  )
}
