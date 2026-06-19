import { Link } from 'react-router-dom'
import { User } from 'lucide-react'

// Unobtrusive floating button shown ONLY on the concierge home route ('/').
// Lets the user reach the back-office (Account / Admin / Discover) without an
// app-level NavBar or BottomNav cluttering the full-screen concierge.
export default function ConciergeBackOfficeButton() {
  return (
    <Link
      to="/profile"
      aria-label="Open account & back-office"
      className="fixed right-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:text-primary"
    >
      <User className="h-5 w-5" strokeWidth={2} />
    </Link>
  )
}
