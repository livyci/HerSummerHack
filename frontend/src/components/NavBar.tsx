import { NavLink } from 'react-router-dom'

// Slim brand-only top bar — navigation lives in the bottom tab bar (BottomNav),
// matching the Lovable concierge layout.
export default function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-3">
        <NavLink to="/" className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-foreground">
            ⛰ ScannedIt
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            Just Scan It.
          </span>
        </NavLink>
      </div>
    </header>
  )
}
