interface DiscountBadgeProps {
  pct: number
}

export default function DiscountBadge({ pct }: DiscountBadgeProps) {
  if (pct <= 0) return null

  return (
    <span className="bg-amber text-white text-xs font-bold px-2 py-0.5 rounded-full">
      -{pct}%
    </span>
  )
}
