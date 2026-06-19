import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
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

  return (
    <div className="min-h-full flex flex-col">
      <NavBar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/navigate" element={<NavigatePage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
    </div>
  )
}
