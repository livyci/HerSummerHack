import { useEffect, useRef, useState } from 'react'
import { scannerAvailable, startSparkScan, type ScanCleanup } from '../lib/scanner'

interface ScanInputProps {
  onScan: (code: string) => void
}

export default function ScanInput({ onScan }: ScanInputProps) {
  const [value, setValue] = useState('')
  const [scanning, setScanning] = useState(false)
  const [camError, setCamError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onScan(trimmed)
    setValue('')
  }

  // SparkScan camera overlay lifecycle.
  useEffect(() => {
    if (!scanning) return
    let cleanup: ScanCleanup | undefined
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    startSparkScan(container, (code) => {
      onScan(code)
      setScanning(false)
    })
      .then((fn) => {
        if (cancelled) fn()
        else cleanup = fn
      })
      .catch((err: unknown) => {
        setCamError(err instanceof Error ? err.message : 'Camera failed to start.')
        setScanning(false)
      })

    return () => {
      cancelled = true
      void cleanup?.()
    }
  }, [scanning, onScan])

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm border border-slate-bg">
      <div className="flex items-center justify-between">
        <label
          htmlFor="scan-barcode"
          className="block text-sm font-semibold text-forest"
        >
          Scan barcode
        </label>
        {scannerAvailable() && (
          <button
            type="button"
            onClick={() => {
              setCamError(null)
              setScanning(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-forest-50 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-forest-50/70"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber" />
            Use camera
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          id="scan-barcode"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type a product barcode…"
          className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/30"
        />
        <button
          type="submit"
          className="rounded-xl bg-forest px-6 py-3 text-base font-semibold text-white hover:bg-forest-dark"
        >
          Scan
        </button>
      </form>

      {camError ? (
        <p className="mt-2 text-xs text-red-600">{camError}</p>
      ) : (
        <p className="mt-2 text-xs text-gray-500">
          Tip: try 7610000000011
          {scannerAvailable() ? ' — or tap “Use camera”.' : ''}
        </p>
      )}

      {scanning && (
        <div className="fixed inset-0 z-[100] bg-black">
          <button
            type="button"
            onClick={() => setScanning(false)}
            className="absolute right-4 top-4 z-[101] rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-gray-900"
          >
            ✕ Close
          </button>
          <div ref={containerRef} className="absolute inset-0" />
        </div>
      )}
    </section>
  )
}
