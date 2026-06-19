interface DiscountBadgeProps {
  pct: number
}

export default function DiscountBadge({ pct }: DiscountBadgeProps) {
  if (pct <= 0) return null

  return (
    <span className="inline-flex items-center bg-amber text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
      -{pct}%
    </span>
  )
}
