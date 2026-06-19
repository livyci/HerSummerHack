import { useMemo } from 'react'
import { getInventory, getZones, formatCategory } from '../lib/inventory'

export default function OverviewTab() {
  const all = useMemo(() => getInventory(), [])
  const zones = useMemo(() => getZones(), [])

  const stats = useMemo(() => {
    const skus = all.length
    const units = all.reduce((s, r) => s + r.stockTotal, 0)
    const onSale = all.filter((r) => r.discount > 0).length
    const lowStock = all.filter((r) => r.stockTotal <= 5).length
    return { skus, units, onSale, lowStock }
  }, [all])

  const byZone = useMemo(() => {
    const map = new Map()
    for (const r of all) {
      const e = map.get(r.zone) ?? { skus: 0, units: 0 }
      e.skus += 1
      e.units += r.stockTotal
      map.set(r.zone, e)
    }
    const max = Math.max(...[...map.values()].map((e) => e.units), 1)
    return zones.map((z) => ({
      ...z,
      ...(map.get(z.value) ?? { skus: 0, units: 0 }),
      max,
    }))
  }, [all, zones])

  const topCategories = useMemo(() => {
    const map = new Map()
    for (const r of all) {
      map.set(r.category, (map.get(r.category) ?? 0) + r.stockTotal)
    }
    return [...map.entries()]
      .map(([cat, units]) => ({ label: formatCategory(cat), units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 8)
  }, [all])

  const maxCat = Math.max(...topCategories.map((c) => c.units), 1)

  return (
    <div className="ov">
      <div className="ov__stats">
        <Stat label="Unique SKUs" value={stats.skus} />
        <Stat label="Units on hand" value={stats.units.toLocaleString('en-CH')} />
        <Stat label="On sale" value={stats.onSale} accent="amber" />
        <Stat label="Low stock (≤5)" value={stats.lowStock} accent="rust" />
      </div>

      <div className="ov__grid">
        <section className="panel">
          <h2 className="panel__title">Stock by zone</h2>
          <ul className="bars">
            {byZone.map((z) => (
              <li key={z.value} className="bars__row">
                <span className={`zone zone--${z.value}`}>
                  <span className="zone__letter">{z.value}</span>
                  <span className="zone__name">{z.name}</span>
                </span>
                <span className="bars__track">
                  <span
                    className="bars__fill"
                    style={{ width: `${Math.round((z.units / z.max) * 100)}%` }}
                  />
                </span>
                <span className="bars__val">{z.units}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2 className="panel__title">Deepest categories</h2>
          <ul className="bars">
            {topCategories.map((c) => (
              <li key={c.label} className="bars__row">
                <span className="bars__cat">{c.label}</span>
                <span className="bars__track">
                  <span
                    className="bars__fill bars__fill--amber"
                    style={{ width: `${Math.round((c.units / maxCat) * 100)}%` }}
                  />
                </span>
                <span className="bars__val">{c.units}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className={`stat${accent ? ` stat--${accent}` : ''}`}>
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  )
}
