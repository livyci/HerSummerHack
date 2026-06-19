import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import NavBar from './components/NavBar'
import BottomNav from './components/BottomNav'
import ConciergeBackOfficeButton from './components/ConciergeBackOfficeButton'
import { ConciergeApp } from './components/concierge/ConciergeApp'
import DiscoverPage from './pages/DiscoverPage'
import ShoppingPage from './pages/ShoppingPage'
import NavigatePage from './pages/NavigatePage'
import InventoryPage from './pages/InventoryPage'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'
import ProfilePage from './pages/ProfilePage'
import { useAppStore } from './store/useAppStore'

export default function App() {
  // Always sign in as Lena (the single demo account) on startup, then her
  // saved purchases load with the session.
  const ensureLena = useAppStore((s) => s.ensureLena)
  useEffect(() => {
    ensureLena()
  }, [ensureLena])

  // The concierge ('/') is a self-contained mobile app with its own header and
  // bottom tab bar, so it owns the full screen — no app-level NavBar/BottomNav.
  const { pathname } = useLocation()
  const isConcierge = pathname === '/'

  const routes = (
    <Routes>
      <Route path="/" element={<ConciergeApp />} />
      <Route path="/discover" element={<DiscoverPage />} />
      <Route path="/shopping" element={<ShoppingPage />} />
      <Route path="/navigate" element={<NavigatePage />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  )

  if (isConcierge) {
    return (
      <div className="min-h-full">
        {routes}
        <ConciergeBackOfficeButton />
      </div>
    )
  }

  return (
    <div className="min-h-full flex flex-col">
      <NavBar />
      <main className="flex-1 pb-24">{routes}</main>
      <BottomNav />
    </div>
  )
}
