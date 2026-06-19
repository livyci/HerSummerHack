import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  getAllProducts,
  getUniqueProducts,
  getDiscounted,
} from '../lib/products'
import { suggestPromotions, MissingApiKeyError } from '../lib/claude'

const FOREST = '#2D6A4F'
const AMBER = '#F4A261'

function formatChf(value: number): string {
  return `CHF ${Math.round(value).toLocaleString('en-US')}`
}

type SortKey = 'name' | 'stock_front'
type SortDir = 'asc' | 'desc'

export default function AdminPage() {
  const all = useMemo(() => getAllProducts(), [])
  const unique = useMemo(() => getUniqueProducts(), [])
  const discounted = useMemo(() => getDiscounted(), [])

  // ---- Summary cards ----
  const totalStockValue = useMemo(
    () => all.reduce((sum, p) => sum + p.price_chf * p.stock_total, 0),
    [all],
  )

  // ---- Stock by zone ----
  const stockByZone = useMemo(() => {
    const map = new Map<string, { name: string; stock: number }>()
    for (const p of all) {
      const entry = map.get(p.zone) ?? { name: p.zone_name, stock: 0 }
      entry.stock += p.stock_total
      map.set(p.zone, entry)
    }
    return Array.from(map.entries())
      .map(([zone, { name, stock }]) => ({ zone, label: `${zone} ${name}`, stock }))
      .sort((a, b) => a.zone.localeCompare(b.zone))
  }, [all])

  // ---- Low-stock alerts ----
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'stock_front',
    dir: 'asc',
  })

  const lowStock = useMemo(() => {
    const rows = all.filter((p) => p.stock_front <= 2)
    const sorted = [...rows].sort((a, b) => {
      let cmp: number
      if (sort.key === 'name') cmp = a.name.localeCompare(b.name)
      else cmp = a.stock_front - b.stock_front
      return sort.dir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [all, sort])

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    )
  }

  // ---- Discount performance ----
  const discountPie = useMemo(
    () => [
      { name: 'On discount', value: discounted.length, color: AMBER },
      {
        name: 'Full price',
        value: unique.length - discounted.length,
        color: FOREST,
      },
    ],
    [discounted, unique],
  )

  const discountedSorted = useMemo(
    () => [...discounted].sort((a, b) => b.discount_pct - a.discount_pct),
    [discounted],
  )

  // ---- Promotions (AI) ----
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoResult, setPromoResult] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)

  async function handleGeneratePromotions() {
    if (promoLoading) return
    setPromoLoading(true)
    setPromoError(null)
    setPromoResult(null)
    try {
      const text = await suggestPromotions(getDiscounted())
      setPromoResult(text)
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        setPromoError(err.message)
      } else {
        setPromoError('Could not generate suggestions right now. Please try again.')
      }
    } finally {
      setPromoLoading(false)
    }
  }

  // ---- Category insights ----
  const categoryStats = useMemo(() => {
    const map = new Map<
      string,
      { skus: number; priceSum: number; stockValue: number }
    >()
    for (const p of all) {
      const entry = map.get(p.category) ?? {
        skus: 0,
        priceSum: 0,
        stockValue: 0,
      }
      entry.skus += 1
      entry.priceSum += p.price_chf
      entry.stockValue += p.price_chf * p.stock_total
      map.set(p.category, entry)
    }
    return Array.from(map.entries()).map(([category, s]) => ({
      category,
      skus: s.skus,
      avgPrice: Math.round(s.priceSum / s.skus),
      stockValue: Math.round(s.stockValue),
    }))
  }, [all])

  const avgPriceByCategory = useMemo(
    () =>
      [...categoryStats]
        .map((c) => ({ category: c.category, avgPrice: c.avgPrice }))
        .sort((a, b) => b.avgPrice - a.avgPrice),
    [categoryStats],
  )

  const skusByCategory = useMemo(
    () =>
      [...categoryStats]
        .map((c) => ({ category: c.category, skus: c.skus }))
        .sort((a, b) => b.skus - a.skus),
    [categoryStats],
  )

  const categoryTable = useMemo(
    () => [...categoryStats].sort((a, b) => b.stockValue - a.stockValue),
    [categoryStats],
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
        Store dashboard
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Live analytics across your full catalogue.
      </p>

      {/* ============ a) Inventory Overview ============ */}
      <h2 className="mt-8 mb-4 text-xl font-bold text-gray-900">
        Inventory Overview
      </h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard label="Total SKUs" value={all.length.toLocaleString('en-US')} />
        <SummaryCard
          label="Unique Products"
          value={unique.length.toLocaleString('en-US')}
        />
        <SummaryCard label="Total Stock Value" value={formatChf(totalStockValue)} />
        <SummaryCard
          label="Items on Discount"
          value={discounted.length.toLocaleString('en-US')}
        />
      </div>

      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-gray-900">Stock by zone</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={stockByZone}>
              <XAxis dataKey="zone" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="stock" name="Units in stock" fill={FOREST} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-gray-900">
          Low-stock alerts
          <span className="ml-2 text-sm font-normal text-gray-400">
            (front stock ≤ 2)
          </span>
        </h3>
        {lowStock.length === 0 ? (
          <p className="text-sm text-gray-500">All shelves are well stocked.</p>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <SortableTh
                    label="Name"
                    active={sort.key === 'name'}
                    dir={sort.dir}
                    onClick={() => toggleSort('name')}
                  />
                  <th className="py-2 pr-3">Size</th>
                  <th className="py-2 pr-3">Zone</th>
                  <th className="py-2 pr-3">Aisle</th>
                  <SortableTh
                    label="Front"
                    active={sort.key === 'stock_front'}
                    dir={sort.dir}
                    onClick={() => toggleSort('stock_front')}
                  />
                  <th className="py-2 pr-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr
                    key={p.product_code}
                    className="border-t border-slate-bg text-gray-700"
                  >
                    <td className="py-2 pr-3 font-medium text-gray-900">
                      {p.name}
                    </td>
                    <td className="py-2 pr-3">{p.size}</td>
                    <td className="py-2 pr-3">
                      {p.zone} {p.zone_name}
                    </td>
                    <td className="py-2 pr-3">{p.aisle}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={
                          p.stock_front <= 0
                            ? 'font-semibold text-red-600'
                            : 'font-semibold text-amber-dark'
                        }
                      >
                        {p.stock_front}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{p.stock_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ b) Discount Performance ============ */}
      <h2 className="mt-10 mb-4 text-xl font-bold text-gray-900">
        Discount Performance
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-gray-900">
            Discounted vs full price
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={discountPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {discountPie.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-gray-900">
            Discounted products
          </h3>
          {discountedSorted.length === 0 ? (
            <p className="text-sm text-gray-500">No products on discount.</p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Discount</th>
                    <th className="py-2 pr-3">Original</th>
                    <th className="py-2 pr-3">Sale</th>
                  </tr>
                </thead>
                <tbody>
                  {discountedSorted.map((p) => {
                    const sale = Math.round(
                      p.price_chf * (1 - p.discount_pct / 100),
                    )
                    return (
                      <tr
                        key={p.product_id}
                        className="border-t border-slate-bg text-gray-700"
                      >
                        <td className="py-2 pr-3 font-medium text-gray-900">
                          {p.name}
                        </td>
                        <td className="py-2 pr-3 font-semibold text-amber-dark">
                          -{p.discount_pct}%
                        </td>
                        <td className="py-2 pr-3 text-gray-400 line-through">
                          CHF {p.price_chf}
                        </td>
                        <td className="py-2 pr-3 font-semibold text-forest">
                          CHF {sale}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Suggested promotions callout */}
      <div className="mt-6 rounded-xl border-l-4 border-forest bg-forest-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-bold text-forest-dark">
            Suggested promotions
          </h3>
          <button
            type="button"
            onClick={handleGeneratePromotions}
            disabled={promoLoading}
            className="rounded-xl bg-forest px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {promoLoading ? 'Generating…' : 'Generate suggestions'}
          </button>
        </div>

        {promoLoading && (
          <div className="mt-4 flex items-center gap-3 text-sm text-forest-dark">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-forest-light border-t-forest" />
            Thinking up the best promotions…
          </div>
        )}

        {!promoLoading && promoError && (
          <p className="mt-4 text-sm text-red-700">{promoError}</p>
        )}

        {!promoLoading && promoResult && (
          <p className="mt-4 whitespace-pre-line text-sm text-gray-700">
            {promoResult}
          </p>
        )}

        {!promoLoading && !promoResult && !promoError && (
          <p className="mt-3 text-sm text-forest-dark/70">
            Get AI-generated bundle and cross-sell ideas based on what's
            currently discounted.
          </p>
        )}
      </div>

      {/* ============ c) Category Insights ============ */}
      <h2 className="mt-10 mb-4 text-xl font-bold text-gray-900">
        Category Insights
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-gray-900">
            Average price by category
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={avgPriceByCategory}>
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11 }}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `CHF ${v}`} />
                <Bar dataKey="avgPrice" name="Avg price (CHF)" fill={FOREST} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-gray-900">
            SKUs per category
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={skusByCategory}>
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 11 }}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="skus" name="# SKUs" fill={AMBER} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-gray-900">
          Categories by stock value
        </h3>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3"># SKUs</th>
                <th className="py-2 pr-3">Avg price</th>
                <th className="py-2 pr-3">Total stock value</th>
              </tr>
            </thead>
            <tbody>
              {categoryTable.map((c) => (
                <tr
                  key={c.category}
                  className="border-t border-slate-bg text-gray-700"
                >
                  <td className="py-2 pr-3 font-medium text-gray-900">
                    {c.category}
                  </td>
                  <td className="py-2 pr-3">{c.skus}</td>
                  <td className="py-2 pr-3">CHF {c.avgPrice}</td>
                  <td className="py-2 pr-3 font-semibold text-forest">
                    {formatChf(c.stockValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
}) {
  return (
    <th className="py-2 pr-3">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${
          active ? 'text-forest' : 'text-gray-500'
        }`}
      >
        {label}
        <span className="text-[10px]">
          {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}
