import { useEffect, useMemo, useRef, useState } from 'react'
import { formatChf } from '../lib/inventory'
import { getUniqueProducts, findByBarcode, recommend } from '../lib/recommend'
import { scannerAvailable, startSparkScan } from '../lib/scanner'

export default function ScanTab() {
  const products = useMemo(() => getUniqueProducts(), [])
  const byName = useMemo(
    () => new Map(products.map((p) => [p.name.toLowerCase(), p])),
    [products],
  )

  const [product, setProduct] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')

  const recs = useMemo(() => recommend(product, { limit: 6 }), [product])

  // ---- SparkScan camera overlay lifecycle ----
  const containerRef = useRef(null)
  useEffect(() => {
    if (!scanning) return
    let cleanup
    let cancelled = false
    startSparkScan(containerRef.current, (code) => {
      const found = findByBarcode(code)
      if (found) {
        setProduct(found)
        setScanning(false)
      } else {
        setError(`Scanned ${code} — not in this catalogue.`)
      }
    })
      .then((fn) => {
        if (cancelled) fn()
        else cleanup = fn
      })
      .catch((e) => {
        setError(e.message)
        setScanning(false)
      })
    return () => {
      cancelled = true
      if (cleanup) cleanup()
    }
  }, [scanning])

  function pickManual(value) {
    const raw = value.trim()
    if (!raw) return
    const found = byName.get(raw.toLowerCase()) ?? findByBarcode(raw)
    if (found) {
      setProduct(found)
      setError('')
    } else {
      setError(`No product matches "${raw}".`)
    }
  }

  function surprise() {
    // index varies by current selection so repeated clicks move around
    const seed = (product ? products.indexOf(product) : 0) + 7
    setProduct(products[(seed * 31) % products.length])
    setError('')
  }

  return (
    <div className="scan">
      <div className="scan__intro">
        <h1 className="scan__title">Scan &amp; Recommend</h1>
        <p className="scan__lede">
          Scan a product barcode to pull it up and see what pairs well with it
          on the trail.
        </p>
      </div>

      <div className="scan__controls">
        {scannerAvailable() ? (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setError('')
              setScanning(true)
            }}
          >
            <span className="btn__dot" /> Scan a barcode
          </button>
        ) : (
          <span className="scan__nokey" title="Set VITE_SCANDIT_LICENSE_KEY to enable the camera">
            Camera scanning needs a Scandit license key — using manual lookup
          </span>
        )}

        <div className="scan__manual">
          <input
            list="product-names"
            value={manual}
            placeholder="Type a product name or paste a barcode…"
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && pickManual(manual)}
          />
          <datalist id="product-names">
            {products.map((p) => (
              <option key={p.id} value={p.name}>
                {p.brand} · {formatChf(p.price)}
              </option>
            ))}
          </datalist>
          <button type="button" className="btn" onClick={() => pickManual(manual)}>
            Look up
          </button>
          <button type="button" className="btn btn--ghost" onClick={surprise}>
            Surprise me
          </button>
        </div>
      </div>

      {error && <p className="scan__error">{error}</p>}

      {product ? (
        <div className="scan__result">
          <article className="anchor">
            <span className={`zone zone--${product.zone}`}>
              <span className="zone__letter">{product.zone}</span>
              <span className="zone__name">{product.zoneName}</span>
            </span>
            <h2 className="anchor__name">{product.name}</h2>
            <p className="anchor__meta">
              {product.brand} · <span className="chip">{product.categoryLabel}</span>
            </p>
            <p className="anchor__desc">{product.description}</p>
            <div className="anchor__foot">
              <span className="anchor__price">{formatChf(product.price)}</span>
              {product.discount > 0 && (
                <span className="anchor__disc">−{product.discount}%</span>
              )}
              <span className="anchor__stock">
                {product.stockTotal} in stock · aisle {product.aisle}
              </span>
            </div>
          </article>

          <section className="recs">
            <h3 className="recs__title">
              Recommended with this
              <span className="recs__hint">tap to explore</span>
            </h3>
            {recs.length === 0 ? (
              <p className="scan__error">No in-stock pairings found.</p>
            ) : (
              <ul className="recs__grid">
                {recs.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="rec"
                      onClick={() => setProduct(r)}
                    >
                      <span className={`rec__reason rec__reason--${r.reason
                        .toLowerCase()
                        .replace(/\s+/g, '-')}`}>
                        {r.reason}
                      </span>
                      <span className="rec__name">{r.name}</span>
                      <span className="rec__meta">
                        {r.brand} · {r.categoryLabel}
                      </span>
                      <span className="rec__foot">
                        <span className="rec__price">{formatChf(r.price)}</span>
                        {r.sharedTags.length > 0 && (
                          <span className="rec__tags">
                            {r.sharedTags.slice(0, 2).join(' · ')}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <div className="scan__empty">
          <span className="scan__empty-mark" aria-hidden="true">⌖</span>
          <p>Nothing scanned yet. Scan, look up, or hit “Surprise me”.</p>
        </div>
      )}

      {scanning && (
        <div className="scanner-overlay">
          <button
            type="button"
            className="scanner-overlay__close"
            onClick={() => setScanning(false)}
          >
            ✕ Close
          </button>
          <div ref={containerRef} className="scanner-overlay__view" />
        </div>
      )}
    </div>
  )
}
