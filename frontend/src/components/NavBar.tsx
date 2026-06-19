import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { useUserStore, useCurrentUser } from '../store/useUserStore'

function linkClass({ isActive }: { isActive: boolean }): string {
  const base = 'px-3 py-2 rounded-full text-sm font-semibold transition-colors'
  return isActive
    ? `${base} bg-amber text-white`
    : `${base} text-forest-50 hover:text-white hover:bg-forest-light`
}

function initials(name: string): string {
  return name.slice(0, 1).toUpperCase()
}

export default function NavBar() {
  const listCount = useAppStore((s) => s.shoppingList.length)
  const accounts = useUserStore((s) => s.accounts)
  const switchUser = useUserStore((s) => s.switchUser)
  const current = useCurrentUser()
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 bg-forest text-white shadow-md">
      <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
        <NavLink to="/" className="text-lg font-bold tracking-tight">
          ⛰ Summit Outfitters
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
                      isActive ? 'bg-white text-amber-dark' : 'bg-amber text-white'
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

          {/* Account chip */}
          <div className="relative ml-1">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full bg-forest-light px-2 py-1.5 text-sm font-semibold hover:bg-forest-dark"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber text-xs font-bold text-white">
                {initials(current.name)}
              </span>
              <span className="hidden sm:inline">{current.name}</span>
            </button>

            {open && (
              <div
                className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl bg-white py-1 text-gray-800 shadow-lg"
                onMouseLeave={() => setOpen(false)}
              >
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Switch account
                </p>
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      switchUser(a.id)
                      setOpen(false)
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-forest-50 ${
                      a.id === current.id ? 'font-bold text-forest' : ''
                    }`}
                  >
                    {a.name}
                    {a.id === current.id && ' ✓'}
                  </button>
                ))}
                <div className="my-1 border-t border-slate-bg" />
                <NavLink
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-sm hover:bg-forest-50"
                >
                  My profile
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
