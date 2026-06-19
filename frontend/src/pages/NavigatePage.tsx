import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { getProductById } from '../lib/products'
import { useAppStore } from '../store/useAppStore'

// Floor-plan position for each store zone (A–G). viewBox is 0 0 340 330.
const ZONE_POS: Record<string, { x: number; y: number }> = {
  A: { x: 70, y: 60 },
  B: { x: 170, y: 60 },
  C: { x: 270, y: 60 },
  D: { x: 70, y: 150 },
  E: { x: 170, y: 150 },
  F: { x: 270, y: 150 },
  G: { x: 170, y: 238 },
}
const ENTRANCE = { x: 55, y: 300 }
const CHECKOUT = { x: 285, y: 300 }

const C = {
  forest: '#2D6A4F',
  forestLight: '#40916C',
  amber: '#F4A261',
  line: '#D8D0BD',
  paper: '#FBF8F0',
  ink: '#1f2937',
  muted: '#9ca3af',
}

interface Stop {
  zone: string
  zoneName: string
  pos: { x: number; y: number }
  items: { name: string; aisle: string; checked: boolean }[]
  done: boolean
}

export default function NavigatePage() {
  const shoppingList = useAppStore((s) => s.shoppingList)

  const stops = useMemo<Stop[]>(() => {
    const byZone = new Map<string, Stop>()
    for (const item of shoppingList) {
      const p: Product | undefined = getProductById(item.productId)
      if (!p) continue
      const stop = byZone.get(p.zone) ?? {
        zone: p.zone,
        zoneName: p.zone_name,
        pos: ZONE_POS[p.zone] ?? { x: 170, y: 150 },
        items: [],
        done: true,
      }
      stop.items.push({ name: p.name, aisle: p.aisle, checked: item.checked })
      if (!item.checked) stop.done = false
      byZone.set(p.zone, stop)
    }
    // Walk the store in zone order (A → G) for a sensible aisle-by-aisle route.
    return [...byZone.values()].sort((a, b) => a.zone.localeCompare(b.zone))
  }, [shoppingList])

  // The route only stops at zones that still have something to collect.
  const routeStops = stops.filter((s) => !s.done)
  const routePoints = [ENTRANCE, ...routeStops.map((s) => s.pos), CHECKOUT]
  const polyline = routePoints.map((p) => `${p.x},${p.y}`).join(' ')
  const totalItems = stops.reduce((n, s) => n + s.items.length, 0)
  const collected = stops.reduce(
    (n, s) => n + s.items.filter((i) => i.checked).length,
    0,
  )

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/shopping"
        className="inline-flex items-center gap-1 text-sm font-medium text-forest hover:underline"
      >
        ← Back to list
      </Link>

      <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900">
        Store navigation
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {totalItems === 0
          ? 'Your list is empty — add items to plan a route.'
          : `Routing you through ${routeStops.length} zone${
              routeStops.length === 1 ? '' : 's'
            } · ${collected}/${totalItems} collected.`}
      </p>

      {totalItems === 0 ? (
        <div className="mt-8 rounded-xl bg-white p-8 text-center text-gray-500 shadow-sm">
          Nothing to navigate to yet.{' '}
          <Link to="/" className="font-semibold text-forest hover:underline">
            Plan an adventure
          </Link>{' '}
          or{' '}
          <Link
            to="/inventory"
            className="font-semibold text-forest hover:underline"
          >
            browse inventory
          </Link>
          .
        </div>
      ) : (
        <>
          {/* Floor plan */}
          <div className="mt-5 rounded-2xl border border-slate-bg bg-white p-3 shadow-sm">
            <svg viewBox="0 0 340 330" className="h-auto w-full">
              {/* route */}
              {routeStops.length > 0 && (
                <polyline
                  points={polyline}
                  fill="none"
                  stroke={C.amber}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="7 7"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-28"
                    dur="0.9s"
                    repeatCount="indefinite"
                  />
                </polyline>
              )}

              {/* zones */}
              {Object.entries(ZONE_POS).map(([zone, { x, y }]) => {
                const stop = stops.find((s) => s.zone === zone)
                const active = Boolean(stop && !stop.done)
                const order = active
                  ? routeStops.findIndex((s) => s.zone === zone) + 1
                  : 0
                return (
                  <g key={zone}>
                    <rect
                      x={x - 38}
                      y={y - 24}
                      width={76}
                      height={48}
                      rx={10}
                      fill={active ? C.forest : C.paper}
                      stroke={stop ? C.forest : C.line}
                      strokeWidth={2}
                    />
                    <text
                      x={x}
                      y={y - 4}
                      textAnchor="middle"
                      fontSize="15"
                      fontWeight="700"
                      fill={active ? '#fff' : C.ink}
                    >
                      {zone}
                    </text>
                    <text
                      x={x}
                      y={y + 13}
                      textAnchor="middle"
                      fontSize="7.5"
                      fill={active ? '#ECECEC' : C.muted}
                    >
                      {stop ? `${stop.items.length} item${stop.items.length === 1 ? '' : 's'}` : '—'}
                    </text>
                    {order > 0 && (
                      <>
                        <circle cx={x + 30} cy={y - 18} r={9} fill={C.amber} />
                        <text
                          x={x + 30}
                          y={y - 14.5}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="700"
                          fill="#fff"
                        >
                          {order}
                        </text>
                      </>
                    )}
                  </g>
                )
              })}

              {/* entrance + checkout */}
              {[
                { p: ENTRANCE, label: 'Entrance' },
                { p: CHECKOUT, label: 'Checkout' },
              ].map(({ p, label }) => (
                <g key={label}>
                  <rect
                    x={p.x - 42}
                    y={p.y - 14}
                    width={84}
                    height={28}
                    rx={8}
                    fill={C.forestLight}
                  />
                  <text
                    x={p.x}
                    y={p.y + 4}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill="#fff"
                  >
                    {label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Stops list */}
          <ol className="mt-5 space-y-3">
            {stops.map((stop) => {
              const order = routeStops.findIndex((s) => s.zone === stop.zone) + 1
              return (
                <li
                  key={stop.zone}
                  className={`rounded-xl border p-4 shadow-sm ${
                    stop.done
                      ? 'border-slate-bg bg-forest-50/40'
                      : 'border-slate-bg bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        stop.done
                          ? 'bg-forest-50 text-forest'
                          : 'bg-amber text-white'
                      }`}
                    >
                      {stop.done ? '✓' : order}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        Zone {stop.zone} · {stop.zoneName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {stop.items.length} item
                        {stop.items.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <ul className="mt-2 space-y-1 pl-10">
                    {stop.items.map((it, idx) => (
                      <li
                        key={`${it.name}-${idx}`}
                        className={`flex items-center justify-between text-sm ${
                          it.checked
                            ? 'text-gray-400 line-through'
                            : 'text-gray-700'
                        }`}
                      >
                        <span>{it.name}</span>
                        <span className="text-xs text-gray-400">
                          Aisle {it.aisle}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </div>
  )
}
