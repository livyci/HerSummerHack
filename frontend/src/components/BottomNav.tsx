import { NavLink } from 'react-router-dom'
import {
  Compass,
  ShoppingBag,
  Package,
  BarChart3,
  User,
  type LucideIcon,
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { cn } from '@/lib/utils'

type Item = {
  to: string
  label: string
  icon: LucideIcon
  badge?: boolean
}

const ITEMS: Item[] = [
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/shopping', label: 'Shopping', icon: ShoppingBag, badge: true },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/admin', label: 'Admin', icon: BarChart3 },
  { to: '/profile', label: 'Account', icon: User },
]

// Lovable-style fixed bottom tab bar.
export default function BottomNav() {
  const listCount = useAppStore((s) => s.shoppingList.length)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-2xl grid-cols-5">
        {ITEMS.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'relative grid h-9 w-12 place-items-center rounded-2xl transition',
                    isActive && 'bg-primary/10',
                  )}
                >
                  <Icon
                    className={cn('h-5 w-5', isActive && 'scale-110')}
                    strokeWidth={2}
                  />
                  {badge && listCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold text-white">
                      {listCount}
                    </span>
                  )}
                </span>
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
