import { useState } from 'react'
import InventoryTab from './components/InventoryTab'
import OverviewTab from './components/OverviewTab'
import ScanTab from './components/ScanTab'
import './App.css'

const TABS = [
  { id: 'inventory', label: 'Store Inventory' },
  { id: 'scan', label: 'Scan & Recommend' },
  { id: 'overview', label: 'Overview' },
]

export default function App() {
  const [tab, setTab] = useState('inventory')

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__mark" aria-hidden="true">
            ▲
          </span>
          <span className="topbar__name">Summit Outfitters</span>
          <span className="topbar__sub">Store Ledger</span>
        </div>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tabs__tab${tab === t.id ? ' is-active' : ''}`}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        {tab === 'inventory' && <InventoryTab />}
        {tab === 'scan' && <ScanTab />}
        {tab === 'overview' && <OverviewTab />}
      </main>
    </div>
  )
}
