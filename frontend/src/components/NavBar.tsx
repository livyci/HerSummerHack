import { NavLink } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

function linkClass({ isActive }: { isActive: boolean }): string {
  const base =
    'px-3 py-2 rounded-full text-sm font-semibold transition-colors'
  return isActive
    ? `${base} bg-amber text-white`
    : `${base} text-forest-50 hover:text-white hover:bg-forest-light`
}

export default function NavBar() {
  const listCount = useAppStore((s) => s.shoppingList.length)
  const navigate = useNavigate()
  const username = useAppStore((s) => s.username)
  const token = useAppStore((s) => s.token)
  const logout = useAppStore((s) => s.logout)

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
          <NavLink to="/admin" className={linkClass}>
            Admin
          </NavLink>
          {token ? (
            <div className="ml-2 flex items-center gap-2">
              <span className="text-sm text-forest-50">{username}</span>
              <button
                type="button"
                onClick={() => {
                  logout()
                  navigate('/auth')
                }}
                className="rounded-full px-3 py-2 text-sm font-semibold text-forest-50 transition-colors hover:bg-forest-light hover:text-white"
              >
                Log out
              </button>
            </div>
          ) : (
            <NavLink to="/auth" className={linkClass}>
              Log in
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  )
}
