import { NavLink } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { useCurrentUser } from '../store/useUserStore'

function linkClass({ isActive }: { isActive: boolean }): string {
  const base = 'px-3 py-2 rounded-full text-sm font-semibold transition-colors'
  return isActive
    ? `${base} bg-forest text-white`
    : `${base} text-gray-500 hover:bg-forest-50 hover:text-gray-900`
}

function initials(name: string): string {
  return name.slice(0, 1).toUpperCase()
}

export default function NavBar() {
  const listCount = useAppStore((s) => s.shoppingList.length)
  const current = useCurrentUser()

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-bg">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <NavLink to="/" className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-gray-900">
            ⛰ ScannedIt
          </span>
          <span className="hidden text-xs font-medium text-gray-400 sm:inline">
            Just Scan It.
          </span>
        </NavLink>
        <div className="flex items-center gap-1">
          <NavLink to="/" className={linkClass} end>
            Discover
          </NavLink>
          <NavLink to="/shopping" className={linkClass}>
            {({ isActive }) => (
              <span className="relative inline-flex items-center">
                Shopping
                {listCount > 0 && (
                  <span
                    className={`ml-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-xs font-bold ${
                      isActive ? 'bg-white text-forest' : 'bg-amber text-white'
                    }`}
                  >
                    {listCount}
                  </span>
                )}
              </span>
            )}
          </NavLink>
          <NavLink to="/inventory" className={linkClass}>
            Inventory
          </NavLink>
          <NavLink to="/admin" className={linkClass}>
            Admin
          </NavLink>

          {/* Signed-in account — always Lena. Links to the profile/preferences. */}
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `ml-1 flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold transition-colors ${
                isActive ? 'bg-forest text-white' : 'text-gray-500 hover:bg-forest-50 hover:text-gray-900'
              }`
            }
            title={`Signed in as ${current.name}`}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber text-xs font-bold text-white">
              {initials(current.name)}
            </span>
            <span className="hidden sm:inline">{current.name}</span>
          </NavLink>
        </div>
      </div>
    </nav>
  )
}
