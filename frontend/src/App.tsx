import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import DiscoverPage from './pages/DiscoverPage'
import ShoppingPage from './pages/ShoppingPage'
import AdminPage from './pages/AdminPage'
import AuthPage from './pages/AuthPage'

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <NavBar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<DiscoverPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </main>
    </div>
  )
}
