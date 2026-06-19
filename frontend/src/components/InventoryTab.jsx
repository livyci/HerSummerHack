import { useMemo, useState } from 'react'
import {
  getInventory,
  getCategories,
  getZones,
  formatChf,
} from '../lib/inventory'

const COLUMNS = [
  { key: 'name', label: 'Product', sortable: true, align: 'left' },
  { key: 'categoryLabel', label: 'Category', sortable: true, align: 'left' },
  { key: 'zone', label: 'Zone', sortable: true, align: 'left' },
  { key: 'price', label: 'Price', sortable: true, align: 'right' },
  { key: 'stockFront', label: 'Floor', sortable: true, align: 'right' },
  { key: 'stockTotal', label: 'On hand', sortable: true, align: 'right' },
]

// Fields the free-text search looks at. NOTE: zone / zone_name / aisle are
// deliberately excluded — zones are a filter, not a search term.
const SEARCH_FIELDS = ['name', 'brand', 'categoryLabel', 'color', 'material']

export default function InventoryTab() {
  const all = useMemo(() => getInventory(), [])
  const categories = useMemo(() => getCategories(), [])
  const zones = useMemo(() => getZones(), [])

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [zone, setZone] = useState('all')
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const tokens = q ? q.split(/\s+/) : []

    const filtered = all.filter((row) => {
      if (category !== 'all' && row.category !== category) return false
      if (zone !== 'all' && row.zone !== zone) return false
      if (tokens.length === 0) return true
      const haystack =
        SEARCH_FIELDS.map((f) => row[f]).join(' ').toLowerCase() +
        ' ' +
        row.tags.join(' ').toLowerCase()
      return tokens.every((t) => haystack.includes(t))
    })

    const { key, dir } = sort
    const factor = dir === 'asc' ? 1 : -1
    return filtered.sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      let cmp
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv))
      // Stable-ish tiebreak by name so equal categories read alphabetically.
      if (cmp === 0 && key !== 'name') cmp = a.name.localeCompare(b.name)
      return cmp * factor
    })
  }, [all, search, category, zone, sort])

  function toggleSort(key) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    )
  }

  const totalUnits = rows.reduce((sum, r) => sum + r.stockTotal, 0)
  const hasFilters = search.trim() || category !== 'all' || zone !== 'all'

  return (
    <div className="inv">
      <div className="inv__controls">
        <div className="field field--search">
          <svg className="field__icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, brands, materials, tags…"
            aria-label="Search inventory"
          />
        </div>

        <label className="field field--select">
          <span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--select">
          <span>Zone</span>
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            <option value="all">All zones</option>
            {zones.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </label>

        {hasFilters && (
          <button
            type="button"
            className="inv__clear"
            onClick={() => {
              setSearch('')
              setCategory('all')
              setZone('all')
            }}
          >
            Clear
          </button>
        )}

        <p className="inv__count">
          <strong>{rows.length}</strong> SKUs
          <span className="inv__count-sep" />
          <strong>{totalUnits.toLocaleString('en-CH')}</strong> units
        </p>
      </div>

      <div className="inv__table-wrap">
        <table className="inv__table">
          <thead>
            <tr>
              {COLUMNS.map((col) => {
                const active = sort.key === col.key
                return (
                  <th
                    key={col.key}
                    className={`inv__th inv__th--${col.align}${
                      active ? ' is-active' : ''
                    }`}
                    aria-sort={
                      active
                        ? sort.dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <button type="button" onClick={() => toggleSort(col.key)}>
                      {col.label}
                      <span className="inv__caret" aria-hidden="true">
                        {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const ratio = row.stockTotal
                ? row.stockFront / row.stockTotal
                : 0
              return (
                <tr key={row.id}>
                  <td className="inv__product">
                    <span className="inv__name">{row.name}</span>
                    <span className="inv__meta">
                      {row.brand} · {row.color} · {row.size}
                    </span>
                  </td>
                  <td>
                    <span className="chip">{row.categoryLabel}</span>
                  </td>
                  <td>
                    <span className={`zone zone--${row.zone}`}>
                      <span className="zone__letter">{row.zone}</span>
                      <span className="zone__name">{row.zoneName}</span>
                    </span>
                  </td>
                  <td className="inv__num inv__price">
                    {formatChf(row.price)}
                    {row.discount > 0 && (
                      <span className="inv__disc">−{row.discount}%</span>
                    )}
                  </td>
                  <td className="inv__num">{row.stockFront}</td>
                  <td className="inv__num">
                    <span className="stock">
                      <span className="stock__val">{row.stockTotal}</span>
                      <span className="stock__bar" aria-hidden="true">
                        <span
                          className="stock__fill"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </span>
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="inv__empty">
            No products match those filters. <br />
            Try clearing the search or widening the category.
          </p>
        )}
      </div>
    </div>
  )
}
